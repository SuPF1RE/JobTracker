import { Briefcase, Plus, Search, Pencil, Trash2, ExternalLink, X, ArrowRight, Check, RefreshCw, Inbox, Moon, Sun } from "lucide-react";
import en from "./locales/en.json";
import ru from "./locales/ru.json";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const statuses = ["Applied", "Interview", "Rejected", "Offer"];
const dictionaries = { en, ru };
const LanguageContext = createContext((text) => text);
const makeLabels = (t) => ({ Applied: t("applied"), Interview: t("interview"), Rejected: t("rejected"), Offer: t("offer") });
const blankForm = () => ({ company: "", position: "", status: "Applied", appliedDate: "", vacancyUrl: "" });

const icons = {
  briefcase: Briefcase, plus: Plus, search: Search, edit: Pencil,
  trash: Trash2, external: ExternalLink, close: X, arrow: ArrowRight,
  check: Check, refresh: RefreshCw, inbox: Inbox, moon: Moon, sun: Sun
};

function Icon({ name, size = 18, className = "" }) {
  const Component = icons[name];
  return Component ? <Component size={size} className={className} strokeWidth={1.7} aria-hidden="true" /> : null;
}

async function request(url, options = {}, t = (text) => text) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = `${t("serverError")} (${response.status}).`;
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

function readableError(error, t) {
  if (error instanceof TypeError) return t("couldNotConnectToThe");
  return error.message || t("somethingWentWrongPleaseTry");
}

function formatDate(value) {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function StatusBadge({ status }) {
  const t = useContext(LanguageContext);
  const labels = makeLabels(t);
  const name = statuses.find((s) => s.toLowerCase() === String(status).toLowerCase());
  return <span className={`badge badge-${(name || "unknown").toLowerCase()}`}><span className="badge-dot" />{labels[name] || status}</span>;
}

function DeleteDialog({ application, deleting, onCancel, onConfirm }) {
  const t = useContext(LanguageContext);
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
      <h2 id="delete-dialog-title">{t("deleteApplication")}</h2>
      <p id="delete-dialog-description">
        {t("youAreAboutToDelete")}<strong>{application.position}</strong>{t("at")}<strong>{application.company}</strong>{t("thisActionCannotBeUndone")}
      </p>
      <div className="delete-dialog-actions">
        <button type="button" className="button button-secondary" onClick={onCancel} disabled={deleting} autoFocus>
          {t("cancel")}
        </button>
        <button type="button" className="button button-danger" onClick={onConfirm} disabled={deleting}>
          {deleting ? t("deleting") : t("deleteApplication2")}
        </button>
      </div>
    </dialog>
  );
}

function ApplicationForm({ initial, onCancel, onSave }) {
  const t = useContext(LanguageContext);
  const labels = makeLabels(t);
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
      setError(t("enterACompanyAndPosition"));
      return;
    }
    if (vacancyUrl) {
      try {
        const url = new URL(vacancyUrl);
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
      } catch {
        setError(t("theLinkMustBeA"));
        return;
      }
    }
    setSaving(true);
    try {
      await onSave({ company, position, status: form.status, appliedDate: form.appliedDate || null, vacancyUrl: vacancyUrl || null });
    } catch (error) {
      setError(`${t("couldNotSaveTheApplication")}${readableError(error, t)}`);
    } finally {
      setSaving(false);
    }
  }

  return <section className="form-panel" aria-labelledby="form-title">
    <div className="form-heading">
      <div><span className="eyebrow">{initial ? t("editApplication") : t("newApplication")}</span><h2 id="form-title">{initial ? t("editApplication2") : t("addApplication")}</h2><p>{t("allTheDetailsInOne")}</p></div>
      <button className="icon-button" type="button" onClick={onCancel} disabled={saving} aria-label={t("closeForm")}><Icon name="close" /></button>
    </div>
    <form onSubmit={submit}>
      <fieldset disabled={saving}>
        <div className="form-grid">
          <label>{t("company")} <span className="required">*</span><input autoFocus name="company" value={form.company} onChange={change} placeholder={t("eGNordSecurity")} required /></label>
          <label>{t("position")} <span className="required">*</span><input name="position" value={form.position} onChange={change} placeholder={t("eGNetDeveloper")} required /></label>
          <label>{t("status")}<select name="status" value={form.status} onChange={change}>{statuses.map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></label>
          <label>{t("applicationDate")} <span className="optional">{t("optional")}</span><input name="appliedDate" type="date" value={form.appliedDate} onChange={change} /></label>
          <label className="full-width">{t("jobPostingUrl")} <span className="optional">{t("optional")}</span><input name="vacancyUrl" type="url" value={form.vacancyUrl} onChange={change} placeholder="https://..." /></label>
        </div>
      </fieldset>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <div className="form-actions"><button type="button" className="button button-secondary" onClick={onCancel} disabled={saving}>{t("cancel")}</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? t("saving") : initial ? t("saveChanges") : t("addApplication")}<Icon name="arrow" size={16}/></button></div>
    </form>
  </section>;
}

function AppContent({ language, setLanguage, t }) {
  const labels = makeLabels(t);
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

  const translationRef = useRef(t);
  translationRef.current = t;
  const load = useCallback(async (signal) => {
    const t = translationRef.current;
    setLoading(true);
    setLoadError("");
    try {
      const data = await request("/api/jobapplications", { signal }, t);
      if (!Array.isArray(data)) throw new Error(t("theApiReturnedDataIn"));
      setItems(data);
      setSelectedId(null);
    } catch (error) {
      if (error.name !== "AbortError") setLoadError(readableError(error, t));
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
    }, t);
    if (isEdit) {
      const updated = saved && typeof saved === "object" && saved.id === form.item.id
        ? saved : { ...form.item, ...payload };
      setItems((current) => current.map((item) => item.id === form.item.id ? updated : item));
      setSelectedId(form.item.id);
    } else {
      if (!saved || typeof saved !== "object" || saved.id == null) {
        throw new Error(t("theApiDidNotReturn"));
      }
      setItems((current) => [saved, ...current]);
      setSelectedId(saved.id);
    }
    // Keep the saved record visible even when a filter was active.
    if (filter !== "All" && filter.toLowerCase() !== payload.status.toLowerCase()) setFilter("All");
    if (search.trim() && !`${payload.company} ${payload.position}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) setSearch("");
    setForm(null);
    setSuccess(isEdit ? t("changesSaved") : t("applicationAdded"));
  }

  async function removeSelected() {
    if (!pendingDelete || deleting || form) return;
    const id = pendingDelete.id;
    setDeleting(true);
    setActionError("");
    setSuccess("");
    try {
      await request(`/api/jobapplications/${id}`, { method: "DELETE" }, t);
      setItems((current) => current.filter((item) => item.id !== id));
      setSelectedId((current) => current === id ? null : current);
      setSuccess(t("applicationDeleted"));
    } catch (error) {
      setActionError(`${t("couldNotDeleteTheApplication")}${readableError(error, t)}`);
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  return <div className="app-shell">
    <header className="topbar"><div className="topbar-inner"><a className="brand" href="/" aria-label={t("jobTrackerHome")}><span className="brand-icon"><Icon name="briefcase" size={19}/></span><span>job<span className="brand-muted">tracker</span><span className="brand-dot">.</span></span></a><div className="topbar-controls"><button type="button" className="theme-toggle language-toggle" onClick={() => setLanguage((current) => current === "en" ? "ru" : "en")} aria-label={t("switchLanguage")}>{language === "en" ? "RU" : "EN"}</button><div className="topbar-right"><span className="local-dot"/><span>{t("yourLocalWorkspace")}</span></div><button type="button" className="theme-toggle" onClick={() => setTheme((current) => current === "light" ? "dark" : "light")} aria-label={theme === "light" ? t("switchToDarkTheme") : t("switchToLightTheme")} aria-pressed={theme === "dark"}><Icon name={theme === "light" ? "moon" : "sun"} size={17}/><span>{theme === "light" ? t("darkMode") : t("lightMode")}</span></button></div></div></header>
    <main className="page">
      <div className="page-heading"><div><div className="breadcrumb">{t("workspace")} <span>/</span> {t("applications")}</div><h1>{t("myApplications")}<span className="heading-dot">.</span></h1><p>{t("keepTrackOfEveryOpportunity")}</p></div><button className="button button-primary add-button" type="button" onClick={() => openForm("add")} disabled={!!form || deleting || loading || !!loadError}><Icon name="plus" size={19}/> {t("addApplication")}</button></div>

      {loading ? <div className="loading-state" role="status"><span className="spinner"/> {t("loadingApplications")}</div> : loadError ? <div className="load-error" role="alert"><div className="empty-icon"><Icon name="refresh" size={22}/></div><h2>{t("couldNotLoadApplications")}</h2><p>{loadError}</p><button className="button button-secondary" onClick={() => load()}><Icon name="refresh" size={16}/> {t("tryAgain")}</button></div> : <>
        <div className="stats" aria-label={t("applicationStatistics")}>
          <div className="stat-card"><span>{t("totalApplications")}</span><strong>{items.length}</strong><small>{t("allSavedApplications")}</small></div>
          <div className="stat-card"><span><i className="stat-dot blue"/>{t("applied2")}</span><strong>{count("Applied")}</strong><small>{t("awaitingAResponse")}</small></div>
          <div className="stat-card"><span><i className="stat-dot amber"/>{t("interview2")}</span><strong>{count("Interview")}</strong><small>{t("nextStage")}</small></div>
          <div className="stat-card"><span><i className="stat-dot green"/>{t("offer2")}</span><strong>{count("Offer")}</strong><small>{t("offersReceived")}</small></div>
        </div>
        {form && <ApplicationForm key={form.mode === "edit" ? `edit-${form.item.id}` : "add"} initial={form.item} onCancel={() => setForm(null)} onSave={save}/>}
        {actionError && <div className="notice notice-error action-notice" role="alert">{actionError}<button className="notice-close" onClick={() => setActionError("")} aria-label={t("dismissMessage")}>×</button></div>}
        {success && <div className="notice notice-success action-notice" role="status"><Icon name="check" size={16}/>{success}<button className="notice-close" onClick={() => setSuccess("")} aria-label={t("dismissMessage")}>×</button></div>}
        <section className="list-card" aria-labelledby="list-title">
          <div className="list-heading"><div><h2 id="list-title">{t("applications2")} <span className="count-pill">{visibleItems.length}</span></h2><p>{t("selectARowToEdit")}</p></div><div className="row-actions"><button className="button button-secondary button-small" onClick={() => openForm("edit", selected)} disabled={!selected || !!form || deleting}><Icon name="edit" size={16}/> {t("edit")}</button><button className="button button-secondary button-small delete-button" onClick={() => setPendingDelete(selected)} disabled={!selected || !!form || deleting}><Icon name="trash" size={16}/> {deleting ? t("deleting") : t("delete")}</button></div></div>
          <div className="filters"><div className="filter-tabs" role="group" aria-label={t("filterByStatus")}>{[["All", t("all")], ...statuses.map((s) => [s, labels[s]])].map(([value, label]) => <button type="button" key={value} className={`filter-tab ${filter === value ? "active" : ""}`} aria-pressed={filter === value} onClick={() => changeFilter(value)} disabled={!!form}>{label}</button>)}</div><label className="search"><Icon name="search" size={17}/><span className="sr-only">{t("searchByCompanyOrPosition")}</span><input value={search} onChange={(event) => changeSearch(event.target.value)} placeholder={t("searchApplications")} disabled={!!form}/></label></div>
          {visibleItems.length === 0 ? <div className="empty-state"><div className="empty-icon"><Icon name={items.length ? "search" : "inbox"} size={23}/></div><h3>{items.length ? t("noResultsFound") : t("noApplicationsYet")}</h3><p>{items.length ? t("tryChangingTheFilterOr") : t("addYourFirstApplicationTo")}</p>{!items.length && <button className="button button-secondary" onClick={() => openForm("add")} disabled={!!form}><Icon name="plus" size={16}/> {t("addApplication")}</button>}</div> : <div className="table-wrap"><table><thead><tr><th>{t("company2")}</th><th>{t("position2")}</th><th>{t("status2")}</th><th>{t("applicationDate2")}</th><th>{t("jobPosting")}</th></tr></thead><tbody>{visibleItems.map((item) => <tr key={item.id} tabIndex={form ? -1 : 0} aria-selected={selectedId === item.id} className={selectedId === item.id ? "selected" : ""} onClick={() => { if (!form && !deleting) setSelectedId(item.id); }} onKeyDown={(event) => { if (event.target === event.currentTarget && !form && !deleting && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setSelectedId(item.id); } }}><td><div className="company-cell"><span className="company-avatar">{(item.company || "?").trim().charAt(0).toUpperCase()}</span><span>{item.company}</span></div></td><td>{item.position}</td><td><StatusBadge status={item.status}/></td><td className="muted-cell">{formatDate(item.appliedDate)}</td><td>{item.vacancyUrl ? <a className="vacancy-link" href={item.vacancyUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>{t("open")} <Icon name="external" size={14}/></a> : <span className="muted-cell">—</span>}</td></tr>)}</tbody></table></div>}
          <div className="list-footer"><span>{(visibleItems.length === items.length ? t("totalCount") : t("shownCount")).replace("{shown}", visibleItems.length).replace("{total}", items.length)}</span><span>{t("dataStoredLocally")} <span className="footer-dot">●</span></span></div>
        </section>
      </>}
      <footer className="page-footer"><span>JOB TRACKER <span className="brand-dot">●</span></span><span>{t("yourJourneyToTheNext")}</span></footer>
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


export default function App() {
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem("jobTrackerLanguage") === "ru" ? "ru" : "en"; }
    catch { return "en"; }
  });
  useEffect(() => {
    document.documentElement.lang = language;
    try { localStorage.setItem("jobTrackerLanguage", language); } catch { /* Storage may be unavailable. */ }
  }, [language]);
  const t = useCallback((text) => dictionaries[language][text] ?? text, [language]);
  return <LanguageContext.Provider value={t}><AppContent language={language} setLanguage={setLanguage} t={t} /></LanguageContext.Provider>;
}
