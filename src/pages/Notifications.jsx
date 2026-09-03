import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../utils/apiClient';
import { useNavigate } from 'react-router-dom';
import { Loader2, Utensils, ClipboardList, HeartPulse, Baby, Check, ChevronRight, Home, Package } from 'lucide-react';
import TopBar from '../components/TopBar';
import RequestsPanel from '../components/RequestsPanel';
import { useRequestCount } from '../hooks/useRequestCount';

// Mirrors crittertrack-frontend's utils/scheduleFieldDefs.js — same 18 dedicated Animal-schema
// fields, kept inline here since Lite has no editing UI for these yet (see AnimalDetail.jsx),
// only alerts + a "Mark Done" quick action against the fields the main site already writes to.
const SCHEDULE_DEFS = [
    { key: 'groomingSchedule', label: 'Grooming' },
    { key: 'brushingSchedule', label: 'Brushing' },
    { key: 'bathingSchedule', label: 'Bathing' },
    { key: 'nailCareSchedule', label: 'Nail/Claw/Hoof Care' },
    { key: 'beakHoofScaleSchedule', label: 'Beak/Hoof/Scale Maintenance' },
    { key: 'skinEarCareSchedule', label: 'Skin & Ear Care' },
    { key: 'dentalCareSchedule', label: 'Dental Care' },
    { key: 'specialCareSchedule', label: 'Special Care Needs' },
    { key: 'healthMonitoringSchedule', label: 'Special Observations' },
    { key: 'exerciseSchedule', label: 'Daily Exercise' },
    { key: 'crateTrainingSchedule', label: 'Crate Training' },
    { key: 'litterTrainingSchedule', label: 'Litter Training' },
    { key: 'leashTrainingSchedule', label: 'Leash Training' },
    { key: 'freeFlightTrainingSchedule', label: 'Free-Flight Training' },
    { key: 'workingRoleTrainingSchedule', label: 'Working Role Training' },
    { key: 'behavioralIssueTrainingSchedule', label: 'Behavioral Issue Training' },
    { key: 'reactivityTrainingSchedule', label: 'Reactivity Training' },
    { key: 'flightRiskTrainingSchedule', label: 'Flight Risk Training' },
];

// Calendar-only date fields (matingDate/expectedDueDate/weaningDate/lastDoneDate/etc.) are stored
// as UTC-midnight timestamps representing a calendar date, not a moment in time. Parsing them
// with plain `new Date(str)` and comparing against LOCAL midnight causes an off-by-one-day bug
// for any user away from UTC+0 — e.g. today's planned matings silently failing to show. Mirrors
// crittertrack-frontend's utils/dateFormatter.js parseLocalDate exactly (see date-timezone-handling
// repo memory note).
const parseLocalDate = (date) => {
    if (date instanceof Date) return date;
    if (typeof date === 'string') {
        const dateOnlyMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dateOnlyMatch) return new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]));
        const isoMidnightMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})T00:00:00/);
        if (isoMidnightMatch) return new Date(Number(isoMidnightMatch[1]), Number(isoMidnightMatch[2]) - 1, Number(isoMidnightMatch[3]));
    }
    return new Date(date);
};
// Exact parity with animalAlertsCron.js's daysSince (zeroes time-of-day on both sides first).
const daysSince = (dateStr) => {
    if (!dateStr) return null;
    const then = parseLocalDate(dateStr);
    if (isNaN(then.getTime())) return null;
    then.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.floor((today - then) / 86400000);
};
const isTaskDue = (lastDate, freqDays) => {
    if (!freqDays) return false;
    if (!lastDate) return true;
    const ds = daysSince(lastDate);
    return ds !== null && ds >= Number(freqDays);
};
// Enclosure.cleaningTasks stores frequency+frequencyUnit, NOT frequencyDays like animal schedule
// fields — must convert before comparing (see enclosure-cleaningtasks-frequency-bug memory note).
const cleaningTaskFreqDays = (t) => {
    if (t.frequencyDays) return t.frequencyDays;
    if (!t.frequency) return null;
    const mult = t.frequencyUnit === 'weeks' ? 7 : t.frequencyUnit === 'months' ? 30 : t.frequencyUnit === 'years' ? 365 : 1;
    return t.frequency * mult;
};
const hoursSince = (dateStr) => {
    if (!dateStr) return null;
    const then = new Date(dateStr);
    if (isNaN(then.getTime())) return null;
    return (Date.now() - then.getTime()) / 3600000;
};
const isPastOrToday = (dateStr) => {
    if (!dateStr) return false;
    const then = parseLocalDate(dateStr);
    if (isNaN(then.getTime())) return false;
    then.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return then <= today;
};
const animalName = (a) => [a.prefix, a.name || 'Unnamed', a.suffix].filter(Boolean).join(' ');

const AlertRow = ({ title, subtitle, onView, actionLabel, onAction, busy }) => (
    <div className="bg-white dark:bg-dark-card-bg rounded-xl p-3 shadow-sm flex items-center gap-3">
        <button onClick={onView} className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold text-gray-800 dark:text-dark-text truncate">{title}</p>
            {subtitle && <p className="text-xs text-gray-500 dark:text-dark-text-muted truncate">{subtitle}</p>}
        </button>
        {onAction && (
            <button
                onClick={onAction}
                disabled={busy}
                className="flex items-center gap-1 bg-accent dark:bg-dark-accent text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50 flex-shrink-0"
            >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {actionLabel}
            </button>
        )}
        {!onAction && onView && <ChevronRight size={16} className="text-gray-300 dark:text-dark-text-muted flex-shrink-0" />}
    </div>
);

const CategorySection = ({ icon, title, count, children }) => (
    <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
            {icon}
            <p className="text-xs font-bold text-gray-400 dark:text-dark-text-muted uppercase">{title}</p>
            {count > 0 && <span className="text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full px-1.5 py-0.5">{count}</span>}
        </div>
        {count === 0 ? (
            <p className="text-xs text-gray-400 dark:text-dark-text-muted px-1 pb-1">Nothing due right now.</p>
        ) : children}
    </div>
);

// Restocking needs a quantity, so this alert gets its own compact inline input instead of AlertRow.
const SupplyAlertRow = ({ supply, onRestock, busy }) => {
    const [qty, setQty] = useState('');
    const isLow = supply.reorderThreshold != null && supply.currentStock <= supply.reorderThreshold;
    return (
        <div className="bg-white dark:bg-dark-card-bg rounded-xl p-3 shadow-sm space-y-2">
            <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-dark-text truncate">{supply.name}</p>
                <p className="text-xs text-gray-500 dark:text-dark-text-muted">
                    {isLow ? `Low stock: ${supply.currentStock}${supply.unit ? ` ${supply.unit}` : ''}` : `Reorder due ${parseLocalDate(supply.nextOrderDate).toLocaleDateString()}`}
                </p>
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder={`Qty received${supply.unit ? ` (${supply.unit})` : ''}`}
                    className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card-bg text-gray-900 dark:text-dark-text text-xs"
                />
                <button
                    onClick={() => { onRestock(qty); setQty(''); }}
                    disabled={busy || !qty}
                    className="flex items-center gap-1 bg-accent dark:bg-dark-accent text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50 flex-shrink-0"
                >
                    {busy ? <Loader2 size={13} className="animate-spin" /> : <Package size={13} />} Restock
                </button>
            </div>
        </div>
    );
};

const Notifications = ({ authToken }) => {
    const navigate = useNavigate();
    const [tab, setTab] = useState('alerts'); // 'alerts' | 'requests'
    const requestCount = useRequestCount(authToken);
    const [animals, setAnimals] = useState([]);
    const [litters, setLitters] = useState([]);
    const [enclosures, setEnclosures] = useState([]);
    const [supplies, setSupplies] = useState([]);
    const [generalCareTasks, setGeneralCareTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyKey, setBusyKey] = useState(null);


    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            // allSettled (not all): while offline, one endpoint having no cached data yet
            // shouldn't blank out the others that DO have a valid cached response.
            const [animalsRes, littersRes, enclosuresRes, suppliesRes, generalTasksRes] = await Promise.allSettled([
                apiClient.get('/animals'),
                apiClient.get('/litters'),
                apiClient.get('/enclosures'),
                apiClient.get('/supplies'),
                apiClient.get('/users/general-tasks'),
            ]);
            const dataOf = (r) => (r.status === 'fulfilled' ? r.value.data : undefined);
            const animalData = Array.isArray(dataOf(animalsRes)) ? dataOf(animalsRes) : [];
            // No isOwned filter — matches NotificationsHub.jsx exactly: every non-archived,
            // non-view-only animal regardless of ownership.
            setAnimals(animalData.filter((a) => !a.isViewOnly && !a.archived));
            if (Array.isArray(dataOf(littersRes))) setLitters(dataOf(littersRes));
            if (Array.isArray(dataOf(enclosuresRes))) setEnclosures(dataOf(enclosuresRes));
            if (Array.isArray(dataOf(suppliesRes))) setSupplies(dataOf(suppliesRes));
            if (Array.isArray(dataOf(generalTasksRes)?.generalCareTasks)) setGeneralCareTasks(dataOf(generalTasksRes).generalCareTasks);
        } catch (error) {
            console.error('Failed to fetch notifications data:', error);
        } finally {
            setLoading(false);
            // Lets the bell icon badge (BrandHeader) refetch immediately after any quick action,
            // instead of waiting for its own 60s poll.
            window.dispatchEvent(new Event('notifications-changed'));
        }
    }, [authToken]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Quick actions below patch local state directly with the same fields just sent to the
    // server, instead of calling fetchAll() — a refetch while offline would just re-serve the
    // stale pre-write cached list and make the action look like it silently did nothing.
    const patchAnimal = (id, fields) => setAnimals((prev) => prev.map((a) => (a.id_public === id ? { ...a, ...fields } : a)));
    const patchLitter = (id, fields) => setLitters((prev) => prev.map((l) => (l._id === id ? { ...l, ...fields } : l)));
    const patchEnclosure = (id, fields) => setEnclosures((prev) => prev.map((e) => (e._id === id ? { ...e, ...fields } : e)));
    const patchSupply = (id, fields) => setSupplies((prev) => prev.map((s) => (s._id === id ? { ...s, ...fields } : s)));

    // ---- Feeding ----
    const feedingAlerts = useMemo(() => (
        animals.filter((a) => a.feedingIntervalHours && (!a.lastFedDate || hoursSince(a.lastFedDate) >= a.feedingIntervalHours))
    ), [animals]);

    const markFed = async (animal) => {
        setBusyKey(`feed-${animal.id_public}`);
        try {
            const fields = { lastFedDate: new Date().toISOString() };
            await apiClient.put(`/animals/${animal.id_public}`, fields);
            patchAnimal(animal.id_public, fields);
        } finally { setBusyKey(null); }
    };

    // ---- Care Tasks: custom animalCareTasks list + the 18 grooming/training schedule fields ----
    const careTaskAlerts = useMemo(() => {
        const out = [];
        animals.forEach((a) => {
            (a.animalCareTasks || []).forEach((task, idx) => {
                if (isTaskDue(task.lastDoneDate, task.frequencyDays)) out.push({ kind: 'custom', animal: a, task, idx, label: task.taskName || 'Care Task' });
            });
            SCHEDULE_DEFS.forEach((def) => {
                const field = a[def.key];
                if (field && isTaskDue(field.lastDoneDate, field.frequencyDays)) out.push({ kind: 'schedule', animal: a, key: def.key, label: def.label });
            });
        });
        return out;
    }, [animals]);

    const markTaskDone = async (animal, idx) => {
        const key = `task-${animal.id_public}-${idx}`;
        setBusyKey(key);
        try {
            const nextTasks = (animal.animalCareTasks || []).map((t, i) => i === idx ? { ...t, lastDoneDate: new Date().toISOString() } : t);
            await apiClient.put(`/animals/${animal.id_public}`, { animalCareTasks: nextTasks });
            patchAnimal(animal.id_public, { animalCareTasks: nextTasks });
        } finally { setBusyKey(null); }
    };
    const markScheduleDone = async (animal, key) => {
        const busyId = `sched-${animal.id_public}-${key}`;
        setBusyKey(busyId);
        try {
            const field = { ...(animal[key] || {}), lastDoneDate: new Date().toISOString(), lastSkipped: false };
            await apiClient.put(`/animals/${animal.id_public}`, { [key]: field });
            patchAnimal(animal.id_public, { [key]: field });
        } finally { setBusyKey(null); }
    };

    // ---- Custom Tasks: standalone tasks not tied to any animal/enclosure (PublicProfile.generalCareTasks).
    // Bucketed into feeding/enclosureCare/careTasks by task.type, exactly like animalAlertsCron.js /
    // NotificationBar.jsx do — this is a distinct list from animal.animalCareTasks above.
    const generalTaskAlerts = useMemo(() => (
        generalCareTasks
            .filter((t) => isTaskDue(t.lastDoneDate, cleaningTaskFreqDays(t)))
            .map((t) => ({
                task: t,
                bucket: t.type === 'Feeding' ? 'feeding' : (t.type === 'Cleaning' || t.type === 'Maintenance') ? 'enclosureCare' : 'careTasks',
            }))
    ), [generalCareTasks]);

    const markGeneralTaskDone = async (task) => {
        setBusyKey(`gtask-${task.id}`);
        try {
            const nextTasks = generalCareTasks.map((t) => t.id === task.id ? { ...t, lastDoneDate: new Date().toISOString(), lastSkipped: false } : t);
            await apiClient.put('/users/general-tasks', { generalCareTasks: nextTasks });
            setGeneralCareTasks(nextTasks);
        } finally { setBusyKey(null); }
    };

    // ---- Health ----
    const healthStatusAlerts = useMemo(() => (
        animals.filter((a) => ['Concern', 'Critical'].includes(a.healthStatusOverride || a.healthStatus))
    ), [animals]);
    const quarantineEndedAlerts = useMemo(() => (
        animals.filter((a) => a.quarantineDetails?.status && a.quarantineDetails.status !== 'None' && a.quarantineDetails.endDate && isPastOrToday(a.quarantineDetails.endDate))
    ), [animals]);

    const clearQuarantine = async (animal) => {
        setBusyKey(`quarantine-${animal.id_public}`);
        try {
            const fields = { quarantineDetails: { ...animal.quarantineDetails, status: 'None' } };
            await apiClient.put(`/animals/${animal.id_public}`, fields);
            patchAnimal(animal.id_public, fields);
        } finally { setBusyKey(null); }
    };

    // ---- Enclosure Care: cleaning/maintenance tasks + supply reorders ----
    const cleaningTaskAlerts = useMemo(() => {
        const out = [];
        enclosures.forEach((enc) => {
            (enc.cleaningTasks || []).forEach((task, idx) => {
                if (isTaskDue(task.lastDoneDate, cleaningTaskFreqDays(task))) out.push({ enclosure: enc, task, idx });
            });
        });
        return out;
    }, [enclosures]);
    const supplyAlerts = useMemo(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return supplies.filter((s) =>
            (s.reorderThreshold != null && s.currentStock <= s.reorderThreshold) ||
            (s.nextOrderDate && parseLocalDate(s.nextOrderDate) <= today)
        );
    }, [supplies]);

    const markCleaningTaskDone = async (enclosure, idx) => {
        const key = `clean-${enclosure._id}-${idx}`;
        setBusyKey(key);
        try {
            const nextTasks = (enclosure.cleaningTasks || []).map((t, i) => i === idx ? { ...t, lastDoneDate: new Date().toISOString() } : t);
            await apiClient.patch(`/enclosures/${enclosure._id}`, { cleaningTasks: nextTasks });
            patchEnclosure(enclosure._id, { cleaningTasks: nextTasks });
        } finally { setBusyKey(null); }
    };
    const restockSupply = async (supply, qty) => {
        const n = Number(qty);
        if (!n || n <= 0) return;
        setBusyKey(`supply-${supply._id}`);
        try {
            const patch = { currentStock: (supply.currentStock || 0) + n };
            if (supply.orderFrequency && supply.orderFrequencyUnit) {
                const base = new Date();
                if (supply.orderFrequencyUnit === 'days') base.setDate(base.getDate() + Number(supply.orderFrequency));
                else if (supply.orderFrequencyUnit === 'weeks') base.setDate(base.getDate() + Number(supply.orderFrequency) * 7);
                else base.setMonth(base.getMonth() + Number(supply.orderFrequency));
                patch.nextOrderDate = base.toISOString().split('T')[0];
            }
            await apiClient.patch(`/supplies/${supply._id}`, patch);
            patchSupply(supply._id, patch);
        } finally { setBusyKey(null); }
    };

    // ---- Breeding ----
    // Mirrors animalAlertsCron.js's litter section exactly — no flat day-count heuristics.
    const plannedMatingAlerts = useMemo(() => (
        litters.filter((l) => l.isPlanned && !l.pregnancyDate && !l.birthDate && l.matingDate && isPastOrToday(l.matingDate))
    ), [litters]);
    const dueDateAlerts = useMemo(() => (
        litters.filter((l) => l.pregnancyDate && !l.birthDate && l.expectedDueDate && isPastOrToday(l.expectedDueDate))
    ), [litters]);
    // Weaning is only "due" once the breeder has set an explicit weaningDate and it has arrived —
    // there's no species-based or flat-day-count fallback on the main site, so Lite must not
    // invent one (that's what previously produced absurd "252 days" style alerts for old litters
    // that were simply never given a weaning date).
    const weaningCheckAlerts = useMemo(() => (
        litters.filter((l) => l.birthDate && l.weaningDate && !l.weaningConfirmed && !l.pregnancyLost && isPastOrToday(l.weaningDate))
    ), [litters]);

    const markMated = async (litter) => {
        setBusyKey(`mate-${litter._id}`);
        try {
            const fields = { matingDate: new Date().toISOString(), isPlanned: false };
            await apiClient.put(`/litters/${litter._id}`, fields);
            patchLitter(litter._id, fields);
        } finally { setBusyKey(null); }
    };
    const markBornToday = async (litter) => {
        setBusyKey(`born-${litter._id}`);
        try {
            const fields = { birthDate: new Date().toISOString() };
            await Promise.all([
                apiClient.put(`/litters/${litter._id}`, fields),
                litter.damId_public
                    ? apiClient.put(`/animals/${litter.damId_public}`, { isPregnant: false, isNursing: true })
                    : Promise.resolve(),
            ]);
            patchLitter(litter._id, fields);
        } finally { setBusyKey(null); }
    };
    const markWeanedToday = async (litter) => {
        setBusyKey(`wean-${litter._id}`);
        try {
            const fields = { weaningDate: new Date().toISOString(), weaningConfirmed: true };
            await Promise.all([
                apiClient.put(`/litters/${litter._id}`, fields),
                litter.damId_public
                    ? apiClient.put(`/animals/${litter.damId_public}`, { isNursing: false })
                    : Promise.resolve(),
            ]);
            patchLitter(litter._id, fields);
        } finally { setBusyKey(null); }
    };

    const generalFeedingAlerts = useMemo(() => generalTaskAlerts.filter((t) => t.bucket === 'feeding'), [generalTaskAlerts]);
    const generalCareTaskAlerts = useMemo(() => generalTaskAlerts.filter((t) => t.bucket === 'careTasks'), [generalTaskAlerts]);
    const generalEnclosureAlerts = useMemo(() => generalTaskAlerts.filter((t) => t.bucket === 'enclosureCare'), [generalTaskAlerts]);

    const totalCount = feedingAlerts.length + careTaskAlerts.length + healthStatusAlerts.length + quarantineEndedAlerts.length
        + cleaningTaskAlerts.length + supplyAlerts.length + plannedMatingAlerts.length + dueDateAlerts.length + weaningCheckAlerts.length
        + generalTaskAlerts.length;

    return (
        <div className="min-h-screen bg-page-bg dark:bg-dark-bg pb-[calc(2rem+env(safe-area-inset-bottom))]">
            <TopBar title="Notifications" onBack={() => navigate(-1)} />
            <div className="flex gap-1 px-4 pt-3">
                {[
                    { key: 'alerts', label: 'Care Alerts', count: totalCount },
                    { key: 'requests', label: 'Requests', count: requestCount },
                ].map(({ key, label, count }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
                            tab === key ? 'bg-accent dark:bg-dark-accent text-white' : 'bg-white dark:bg-dark-card-bg text-gray-500 dark:text-dark-text-muted'
                        }`}
                    >
                        {label}
                        {count > 0 && (
                            <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${tab === key ? 'bg-white/25 text-white' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                                {count}
                            </span>
                        )}
                    </button>
                ))}
            </div>
            <div className="px-4 pt-3 space-y-5">
                {tab === 'requests' ? (
                    <RequestsPanel navigate={navigate} />
                ) : loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="animate-spin text-accent" size={28} /></div>
                ) : (
                    <>
                        <CategorySection icon={<Utensils size={14} className="text-gray-400 dark:text-dark-text-muted" />} title="Feeding" count={feedingAlerts.length + generalFeedingAlerts.length}>
                            <div className="space-y-2">
                                {feedingAlerts.map((a) => (
                                    <AlertRow
                                        key={a.id_public}
                                        title={animalName(a)}
                                        subtitle={a.lastFedDate ? `Last fed ${new Date(a.lastFedDate).toLocaleDateString()}` : 'Never fed'}
                                        onView={() => navigate(`/animals/${a.id_public}`)}
                                        actionLabel="Mark Fed"
                                        onAction={() => markFed(a)}
                                        busy={busyKey === `feed-${a.id_public}`}
                                    />
                                ))}
                                {generalFeedingAlerts.map(({ task }) => (
                                    <AlertRow
                                        key={`gtask-${task.id}`}
                                        title={task.taskName}
                                        subtitle="Custom task"
                                        actionLabel="Mark Done"
                                        onAction={() => markGeneralTaskDone(task)}
                                        busy={busyKey === `gtask-${task.id}`}
                                    />
                                ))}
                            </div>
                        </CategorySection>

                        <CategorySection icon={<ClipboardList size={14} className="text-gray-400 dark:text-dark-text-muted" />} title="Care Tasks" count={careTaskAlerts.length + generalCareTaskAlerts.length}>
                            <div className="space-y-2">
                                {careTaskAlerts.map((item) => (
                                    <AlertRow
                                        key={item.kind === 'custom' ? `custom-${item.animal.id_public}-${item.idx}` : `sched-${item.animal.id_public}-${item.key}`}
                                        title={item.label}
                                        subtitle={animalName(item.animal)}
                                        onView={() => navigate(`/animals/${item.animal.id_public}`)}
                                        actionLabel="Mark Done"
                                        onAction={() => item.kind === 'custom' ? markTaskDone(item.animal, item.idx) : markScheduleDone(item.animal, item.key)}
                                        busy={busyKey === (item.kind === 'custom' ? `task-${item.animal.id_public}-${item.idx}` : `sched-${item.animal.id_public}-${item.key}`)}
                                    />
                                ))}
                                {generalCareTaskAlerts.map(({ task }) => (
                                    <AlertRow
                                        key={`gtask-${task.id}`}
                                        title={task.taskName}
                                        subtitle="Custom task"
                                        actionLabel="Mark Done"
                                        onAction={() => markGeneralTaskDone(task)}
                                        busy={busyKey === `gtask-${task.id}`}
                                    />
                                ))}
                            </div>
                        </CategorySection>

                        <CategorySection icon={<HeartPulse size={14} className="text-gray-400 dark:text-dark-text-muted" />} title="Health" count={healthStatusAlerts.length + quarantineEndedAlerts.length}>
                            <div className="space-y-2">
                                {healthStatusAlerts.map((a) => (
                                    <AlertRow
                                        key={`hs-${a.id_public}`}
                                        title={animalName(a)}
                                        subtitle={`Health status: ${a.healthStatusOverride || a.healthStatus}`}
                                        onView={() => navigate(`/animals/${a.id_public}`)}
                                    />
                                ))}
                                {quarantineEndedAlerts.map((a) => (
                                    <AlertRow
                                        key={`q-${a.id_public}`}
                                        title={animalName(a)}
                                        subtitle="Quarantine/isolation end date has passed — review status"
                                        onView={() => navigate(`/animals/${a.id_public}`)}
                                        actionLabel="Clear"
                                        onAction={() => clearQuarantine(a)}
                                        busy={busyKey === `quarantine-${a.id_public}`}
                                    />
                                ))}
                            </div>
                        </CategorySection>

                        <CategorySection icon={<Home size={14} className="text-gray-400 dark:text-dark-text-muted" />} title="Enclosure Care" count={cleaningTaskAlerts.length + supplyAlerts.length + generalEnclosureAlerts.length}>
                            <div className="space-y-2">
                                {cleaningTaskAlerts.map(({ enclosure, task, idx }) => (
                                    <AlertRow
                                        key={`clean-${enclosure._id}-${idx}`}
                                        title={task.taskName || task.type || 'Cleaning Task'}
                                        subtitle={enclosure.name}
                                        onView={() => navigate('/enclosures')}
                                        actionLabel="Mark Done"
                                        onAction={() => markCleaningTaskDone(enclosure, idx)}
                                        busy={busyKey === `clean-${enclosure._id}-${idx}`}
                                    />
                                ))}
                                {generalEnclosureAlerts.map(({ task }) => (
                                    <AlertRow
                                        key={`gtask-${task.id}`}
                                        title={task.taskName}
                                        subtitle="Custom task"
                                        actionLabel="Mark Done"
                                        onAction={() => markGeneralTaskDone(task)}
                                        busy={busyKey === `gtask-${task.id}`}
                                    />
                                ))}
                                {supplyAlerts.map((s) => (
                                    <SupplyAlertRow
                                        key={`supply-${s._id}`}
                                        supply={s}
                                        onRestock={(qty) => restockSupply(s, qty)}
                                        busy={busyKey === `supply-${s._id}`}
                                    />
                                ))}
                            </div>
                        </CategorySection>

                        <CategorySection icon={<Baby size={14} className="text-gray-400 dark:text-dark-text-muted" />} title="Breeding" count={plannedMatingAlerts.length + dueDateAlerts.length + weaningCheckAlerts.length}>
                            <div className="space-y-2">
                                {plannedMatingAlerts.map((l) => (
                                    <AlertRow
                                        key={`mate-${l._id}`}
                                        title={l.breedingPairCodeName || l.litter_id_public || 'Planned Mating'}
                                        subtitle="Planned mating date has arrived"
                                        onView={() => navigate('/breeding')}
                                        actionLabel="Mark Mated"
                                        onAction={() => markMated(l)}
                                        busy={busyKey === `mate-${l._id}`}
                                    />
                                ))}
                                {dueDateAlerts.map((l) => (
                                    <AlertRow
                                        key={`due-${l._id}`}
                                        title={l.breedingPairCodeName || l.litter_id_public || 'Litter'}
                                        subtitle="Expected due date has arrived"
                                        onView={() => navigate('/breeding')}
                                        actionLabel="Born Today"
                                        onAction={() => markBornToday(l)}
                                        busy={busyKey === `born-${l._id}`}
                                    />
                                ))}
                                {weaningCheckAlerts.map((l) => (
                                    <AlertRow
                                        key={`wean-${l._id}`}
                                        title={l.breedingPairCodeName || l.litter_id_public || 'Litter'}
                                        subtitle="Expected weaning date has arrived"
                                        onView={() => navigate('/breeding')}
                                        actionLabel="Wean Today"
                                        onAction={() => markWeanedToday(l)}
                                        busy={busyKey === `wean-${l._id}`}
                                    />
                                ))}
                            </div>
                        </CategorySection>
                    </>
                )}
            </div>
        </div>
    );
};

export default Notifications;
