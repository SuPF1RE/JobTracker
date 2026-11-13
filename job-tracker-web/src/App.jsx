import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const statuses = ["Applied", "Interview", "Rejected", "Offer"];
const labels = { Applied: "Отклик", Interview: "Интервью", Rejected: "Отказ", Offer: "Оффер" };
const blankForm = () => ({ company: "", position: "", status: "Applied", appliedDate: "", vacancyUrl: "" });

function Icon({ name, size = 18, className = "" }) {
  const paths = {
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    edit: <><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/></>,
    external: <><path d="M14 4h6v6M20 4l-9 9"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/></>,
    close: <path d="M18 6 6 18M6 6l12 12"/>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    refresh: <><path d="M20 11a8 8 0 0 0-14-5L4 8M4 3v5h5M4 13a8 8 0 0 0 14 5l2-2M20 21v-5h-5"/></>,
    inbox: <><path d="M4 4h16l2 10v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-5L4 4Z"/><path d="M2 14h6l2 3h4l2-3h6"/></>,
    moon: <path d="M20.9 13.1A8 8 0 0 1 10.9 3.1a8 8 0 1 0 10 10Z"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>
  };
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = `Ошибка сервера (${response.status}).`;
    try {
      const body = await response.json();
      if (typeof body.message === "string") message = body.message;
    } catch { /* Some APIs return an empty error response. */ }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function readableError(error) {
  if (error instanceof TypeError) return "Не удалось связаться с API. Проверьте, запущен ли сервер.";
  return error.message || "Что-то пошло не так. Попробуйте ещё раз.";
}

function formatDate(value) {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function StatusBadge({ status }) {
  const name = statuses.find((s) => s.toLowerCase() === String(status).toLowerCase());
  return <span className={`badge badge-${(name || "unknown").toLowerCase()}`}><span className="badge-dot" />{labels[name] || status}</span>;
}

function DeleteDialog({ application, deleting, onCancel, onConfirm }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="delete-dialog"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!deleting) onCancel();
      }}
    >
      <div className="delete-dialog-icon"><Icon name="trash" size={22} /></div>
      <h2 id="delete-dialog-title">Удалить отклик?</h2>
      <p id="delete-dialog-description">
        Вы собираетесь удалить отклик <strong>{application.position}</strong> в компании <strong>{application.company}</strong>. Это действие нельзя отменить.
      </p>
      <div className="delete-dialog-actions">
        <button type="button" className="button button-secondary" onClick={onCancel} disabled={deleting} autoFocus>
          Отмена
        </button>
        <button type="button" className="button button-danger" onClick={onConfirm} disabled={deleting}>
          {deleting ? "Удаление…" : "Удалить отклик"}
        </button>
      </div>
    </dialog>
  );
}

function ApplicationForm({ initial, onCancel, onSave }) {
  const [form, setForm] = useState(() => initial ? {
    company: initial.company || "", position: initial.position || "", status: initial.status || "Applied",
    appliedDate: initial.appliedDate || "", vacancyUrl: initial.vacancyUrl || ""
  } : blankForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setError("");
    const company = form.company.trim();
    const position = form.position.trim();
    const vacancyUrl = form.vacancyUrl.trim();
    if (!company || !position) {
      setError("Укажите компанию и должность. Поля не могут состоять только из пробелов.");
      return;
    }
    if (vacancyUrl) {
      try {
        const url = new URL(vacancyUrl);
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
      } catch {
        setError("Ссылка должна быть полным адресом, начинающимся с http:// или https://.");
        return;
      }
    }
    setSaving(true);
    try {
      await onSave({ company, position, status: form.status, appliedDate: form.appliedDate || null, vacancyUrl: vacancyUrl || null });
    } catch (error) {
      setError(`Не удалось сохранить отклик. ${readableError(error)}`);
    } finally {
      setSaving(false);
    }
  }

  return <section className="form-panel" aria-labelledby="form-title">
    <div className="form-heading">
      <div><span className="eyebrow">{initial ? "РЕДАКТИРОВАНИЕ" : "НОВЫЙ ОТКЛИК"}</span><h2 id="form-title">{initial ? "Изменить отклик" : "Добавить отклик"}</h2><p>Все детали в одном месте.</p></div>
      <button className="icon-button" type="button" onClick={onCancel} disabled={saving} aria-label="Закрыть форму"><Icon name="close" /></button>
    </div>
    <form onSubmit={submit}>
      <fieldset disabled={saving}>
        <div className="form-grid">
          <label>Компания <span className="required">*</span><input autoFocus name="company" value={form.company} onChange={change} placeholder="Например, Nord Security" required /></label>
          <label>Должность <span className="required">*</span><input name="position" value={form.position} onChange={change} placeholder="Например, .NET Developer" required /></label>
          <label>Статус<select name="status" value={form.status} onChange={change}>{statuses.map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></label>
          <label>Дата отклика <span className="optional">необязательно</span><input name="appliedDate" type="date" value={form.appliedDate} onChange={change} /></label>
          <label className="full-width">Ссылка на вакансию <span className="optional">необязательно</span><input name="vacancyUrl" type="url" value={form.vacancyUrl} onChange={change} placeholder="https://..." /></label>
        </div>
      </fieldset>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <div className="form-actions"><button type="button" className="button button-secondary" onClick={onCancel} disabled={saving}>Отмена</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? "Сохранение…" : initial ? "Сохранить изменения" : "Добавить отклик"}<Icon name="arrow" size={16}/></button></div>
    </form>
  </section>;
}

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("jobTrackerTheme") === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("jobTrackerTheme", theme);
    } catch {
      // The theme still works for this session if storage is unavailable.
    }
  }, [theme]);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await request("/api/jobapplications", { signal });
      if (!Array.isArray(data)) throw new Error("API вернул данные в неожиданном формате.");
      setItems(data);
      setSelectedId(null);
    } catch (error) {
      if (error.name !== "AbortError") setLoadError(readableError(error));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const selected = items.find((item) => item.id === selectedId) || null;
  const visibleItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return items.filter((item) => {
      const matchesStatus = filter === "All" || String(item.status).toLowerCase() === filter.toLowerCase();
      const matchesSearch = !term || `${item.company} ${item.position}`.toLocaleLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [items, filter, search]);
  const count = (status) => items.filter((item) => String(item.status).toLowerCase() === status.toLowerCase()).length;

  function changeFilter(value) { setFilter(value); setSelectedId(null); }
  function changeSearch(value) { setSearch(value); setSelectedId(null); }
  function openForm(mode, item = null) { setActionError(""); setSuccess(""); setForm({ mode, item }); }

  async function save(payload) {
    const isEdit = form.mode === "edit";
    const url = isEdit ? `/api/jobapplications/${form.item.id}` : "/api/jobapplications";
    const saved = await request(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEdit ? { ...payload, id: form.item.id } : payload)
    });
    if (isEdit) {
      const updated = saved && typeof saved === "object" && saved.id === form.item.id
        ? saved : { ...form.item, ...payload };
      setItems((current) => current.map((item) => item.id === form.item.id ? updated : item));
      setSelectedId(form.item.id);
    } else {
      if (!saved || typeof saved !== "object" || saved.id == null) {
        throw new Error("API не вернул созданный отклик. Обновите страницу перед повторной отправкой.");
      }
      setItems((current) => [saved, ...current]);
      setSelectedId(saved.id);
    }
    // Keep the saved record visible even when a filter was active.
    if (filter !== "All" && filter.toLowerCase() !== payload.status.toLowerCase()) setFilter("All");
    if (search.trim() && !`${payload.company} ${payload.position}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) setSearch("");
    setForm(null);
    setSuccess(isEdit ? "Изменения сохранены." : "Отклик добавлен.");
  }

  async function removeSelected() {
    if (!pendingDelete || deleting || form) return;
    const id = pendingDelete.id;
    setDeleting(true);
    setActionError("");
    setSuccess("");
    try {
      await request(`/api/jobapplications/${id}`, { method: "DELETE" });
      setItems((current) => current.filter((item) => item.id !== id));
      setSelectedId((current) => current === id ? null : current);
      setSuccess("Отклик удалён.");
    } catch (error) {
      setActionError(`Не удалось удалить отклик. ${readableError(error)}`);
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  return <div className="app-shell">
    <header className="topbar"><div className="topbar-inner"><a className="brand" href="/" aria-label="Job Tracker — на главную"><span className="brand-icon"><Icon name="briefcase" size={19}/></span><span>job<span className="brand-muted">tracker</span><span className="brand-dot">.</span></span></a><div className="topbar-controls"><div className="topbar-right"><span className="local-dot"/><span>Ваше локальное пространство</span></div><button type="button" className="theme-toggle" onClick={() => setTheme((current) => current === "light" ? "dark" : "light")} aria-label={theme === "light" ? "Включить тёмную тему" : "Включить светлую тему"} aria-pressed={theme === "dark"}><Icon name={theme === "light" ? "moon" : "sun"} size={17}/><span>{theme === "light" ? "Тёмная тема" : "Светлая тема"}</span></button></div></div></header>
    <main className="page">
      <div className="page-heading"><div><div className="breadcrumb">РАБОЧЕЕ ПРОСТРАНСТВО <span>/</span> ОТКЛИКИ</div><h1>Мои отклики<span className="heading-dot">.</span></h1><p>Все возможности, за которыми стоит следить.</p></div><button className="button button-primary add-button" type="button" onClick={() => openForm("add")} disabled={!!form || deleting || loading || !!loadError}><Icon name="plus" size={19}/> Добавить отклик</button></div>

      {loading ? <div className="loading-state" role="status"><span className="spinner"/> Загружаем отклики…</div> : loadError ? <div className="load-error" role="alert"><div className="empty-icon"><Icon name="refresh" size={22}/></div><h2>Не удалось загрузить отклики</h2><p>{loadError}</p><button className="button button-secondary" onClick={() => load()}><Icon name="refresh" size={16}/> Попробовать снова</button></div> : <>
        <div className="stats" aria-label="Статистика откликов">
          <div className="stat-card"><span>ВСЕГО ОТКЛИКОВ</span><strong>{items.length}</strong><small>Все сохранённые вакансии</small></div>
          <div className="stat-card"><span><i className="stat-dot blue"/>ОТКЛИК</span><strong>{count("Applied")}</strong><small>Ожидают ответа</small></div>
          <div className="stat-card"><span><i className="stat-dot amber"/>ИНТЕРВЬЮ</span><strong>{count("Interview")}</strong><small>Следующий этап</small></div>
          <div className="stat-card"><span><i className="stat-dot green"/>ОФФЕР</span><strong>{count("Offer")}</strong><small>Полученные предложения</small></div>
        </div>
        {form && <ApplicationForm key={form.mode === "edit" ? `edit-${form.item.id}` : "add"} initial={form.item} onCancel={() => setForm(null)} onSave={save}/>}
        {actionError && <div className="notice notice-error action-notice" role="alert">{actionError}<button className="notice-close" onClick={() => setActionError("")} aria-label="Закрыть сообщение">×</button></div>}
        {success && <div className="notice notice-success action-notice" role="status"><Icon name="check" size={16}/>{success}<button className="notice-close" onClick={() => setSuccess("")} aria-label="Закрыть сообщение">×</button></div>}
        <section className="list-card" aria-labelledby="list-title">
          <div className="list-heading"><div><h2 id="list-title">Список откликов <span className="count-pill">{visibleItems.length}</span></h2><p>Выберите строку, чтобы изменить или удалить отклик.</p></div><div className="row-actions"><button className="button button-secondary button-small" onClick={() => openForm("edit", selected)} disabled={!selected || !!form || deleting}><Icon name="edit" size={16}/> Изменить</button><button className="button button-secondary button-small delete-button" onClick={() => setPendingDelete(selected)} disabled={!selected || !!form || deleting}><Icon name="trash" size={16}/> {deleting ? "Удаление…" : "Удалить"}</button></div></div>
          <div className="filters"><div className="filter-tabs" role="group" aria-label="Фильтр по статусу">{[["All", "Все"], ...statuses.map((s) => [s, labels[s]])].map(([value, label]) => <button type="button" key={value} className={`filter-tab ${filter === value ? "active" : ""}`} aria-pressed={filter === value} onClick={() => changeFilter(value)} disabled={!!form}>{label}</button>)}</div><label className="search"><Icon name="search" size={17}/><span className="sr-only">Поиск по компании или должности</span><input value={search} onChange={(event) => changeSearch(event.target.value)} placeholder="Поиск по откликам" disabled={!!form}/></label></div>
          {visibleItems.length === 0 ? <div className="empty-state"><div className="empty-icon"><Icon name={items.length ? "search" : "inbox"} size={23}/></div><h3>{items.length ? "Ничего не найдено" : "Здесь пока пусто"}</h3><p>{items.length ? "Попробуйте изменить фильтр или поисковый запрос." : "Добавьте первый отклик, чтобы следить за его статусом."}</p>{!items.length && <button className="button button-secondary" onClick={() => openForm("add")} disabled={!!form}><Icon name="plus" size={16}/> Добавить отклик</button>}</div> : <div className="table-wrap"><table><thead><tr><th>КОМПАНИЯ</th><th>ДОЛЖНОСТЬ</th><th>СТАТУС</th><th>ДАТА ОТКЛИКА</th><th>ВАКАНСИЯ</th></tr></thead><tbody>{visibleItems.map((item) => <tr key={item.id} tabIndex={form ? -1 : 0} aria-selected={selectedId === item.id} className={selectedId === item.id ? "selected" : ""} onClick={() => { if (!form && !deleting) setSelectedId(item.id); }} onKeyDown={(event) => { if (event.target === event.currentTarget && !form && !deleting && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setSelectedId(item.id); } }}><td><div className="company-cell"><span className="company-avatar">{(item.company || "?").trim().charAt(0).toUpperCase()}</span><span>{item.company}</span></div></td><td>{item.position}</td><td><StatusBadge status={item.status}/></td><td className="muted-cell">{formatDate(item.appliedDate)}</td><td>{item.vacancyUrl ? <a className="vacancy-link" href={item.vacancyUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>Открыть <Icon name="external" size={14}/></a> : <span className="muted-cell">—</span>}</td></tr>)}</tbody></table></div>}
          <div className="list-footer"><span>{visibleItems.length === items.length ? `Всего откликов: ${items.length}` : `Показано ${visibleItems.length} из ${items.length}`}</span><span>Данные хранятся локально <span className="footer-dot">●</span></span></div>
        </section>
      </>}
      <footer className="page-footer"><span>JOB TRACKER <span className="brand-dot">●</span></span><span>Ваш путь к следующей возможности.</span></footer>
    </main>
    {pendingDelete && (
      <DeleteDialog
        application={pendingDelete}
        deleting={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={removeSelected}
      />
    )}
  </div>;
}
