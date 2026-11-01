import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  Wallet,
  Plus,
  Trash2,
  Edit3,
  CheckCircle,
  FileDown,
  FileUp,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { EventPlan, EventType, CurrencyCode } from '../../types';
import { INITIAL_WEDDING_ALLOCATIONS } from '../../domain/budgetEngine';
import { generateDefaultMilestones, generateDefaultTasks } from '../../domain/timelineEngine';
import { useAccessibleModal } from '../../hooks/useAccessibleModal';

interface EventsViewProps {
  events: EventPlan[];
  activeEvent: EventPlan;
  onSelectEvent: (id: string) => void;
  onSaveEvent: (event: EventPlan) => void;
  onDeleteEvent: (id: string) => void;
  onExportJSON: () => void;
  onImportJSON: (jsonStr: string) => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  events,
  activeEvent,
  onSelectEvent,
  onSaveEvent,
  onDeleteEvent,
  onExportJSON,
  onImportJSON,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const modalRef = useAccessibleModal({
    isOpen: isModalOpen,
    onClose: () => setIsModalOpen(false),
  });

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<EventType>('Wedding');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [guestCount, setGuestCount] = useState<number>(200);
  const [totalBudget, setTotalBudget] = useState<number>(1000000);
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [userPreferences, setUserPreferences] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [priorityConsiderations, setPriorityConsiderations] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingEventId(null);
    setName('');
    setType('Wedding');
    setLocation('Chennai, Tamil Nadu, India');
    // Default to ~6 months in future
    const d = new Date();
    d.setMonth(d.getMonth() + 5);
    setEventDate(d.toISOString().split('T')[0]);
    setGuestCount(300);
    setTotalBudget(1500000);
    setCurrency('INR');
    setUserPreferences('Traditional aesthetics with contemporary dining.');
    setSpecialRequirements('Live music stage, dietary accommodations.');
    setPriorityConsiderations('Food quality (#1), Candid photography, Punctual run of show.');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (event: EventPlan) => {
    setEditingEventId(event.id);
    setName(event.name);
    setType(event.type as EventType);
    setLocation(event.location);
    setEventDate(event.eventDate);
    setGuestCount(event.guestCount);
    setTotalBudget(event.totalBudget);
    setCurrency(event.currency);
    setUserPreferences(event.userPreferences ?? '');
    setSpecialRequirements(event.specialRequirements ?? '');
    setPriorityConsiderations(event.priorityConsiderations ?? '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Strict Validation
    if (!name.trim()) {
      setFormError('Event name is required.');
      return;
    }
    if (!location.trim()) {
      setFormError('Event location is required.');
      return;
    }
    if (!eventDate) {
      setFormError('Target event date is required.');
      return;
    }
    if (guestCount <= 0) {
      setFormError('Guest count must be greater than 0.');
      return;
    }
    if (totalBudget <= 0) {
      setFormError('Total budget must be a positive number.');
      return;
    }

    if (editingEventId) {
      // Update existing
      const existing = events.find((ev) => ev.id === editingEventId);
      if (existing) {
        const updated: EventPlan = {
          ...existing,
          name: name.trim(),
          type,
          location: location.trim(),
          eventDate,
          guestCount,
          totalBudget,
          currency,
          userPreferences,
          specialRequirements,
          priorityConsiderations,
          updatedAt: new Date().toISOString(),
        };
        onSaveEvent(updated);
      }
    } else {
      // Create new
      const newId = `cai-event-${Date.now()}`;
      const defaultMilestones = generateDefaultMilestones(eventDate, type);
      const defaultTasks = generateDefaultTasks(eventDate, defaultMilestones);

      const allocations = INITIAL_WEDDING_ALLOCATIONS.map((a) => ({
        category: a.category,
        percentage: a.percentage,
        allocatedAmount: Math.round((totalBudget * a.percentage) / 100),
      }));

      const newPlan: EventPlan = {
        id: newId,
        name: name.trim(),
        type,
        location: location.trim(),
        eventDate,
        guestCount,
        totalBudget,
        currency,
        userPreferences,
        specialRequirements,
        priorityConsiderations,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        budgetAllocations: allocations,
        expenses: [],
        milestones: defaultMilestones,
        tasks: defaultTasks,
        vendors: [],
        risks: [],
      };
      onSaveEvent(newPlan);
    }

    setIsModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImportJSON(content);
      }
    };
    reader.readAsText(file);
  };

  const formatCurrency = (amt: number, curr: CurrencyCode) => {
    const sym = curr === 'INR' ? '₹' : curr === 'USD' ? '$' : curr === 'EUR' ? '€' : '£';
    return `${sym}${amt.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Event Portfolio Manager</h1>
          <p className="text-xs text-slate-500 mt-1">
            Create, switch, edit, and back up multiple celebration blueprints
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* JSON Export */}
          <button
            onClick={onExportJSON}
            className="px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            title="Export all events as JSON backup"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-500" />
            <span>Export JSON</span>
          </button>

          {/* JSON Import */}
          <label className="px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer">
            <FileUp className="w-3.5 h-3.5 text-slate-500" />
            <span>Import JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Create New Event */}
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {events.map((ev) => {
          const isActive = ev.id === activeEvent.id;

          return (
            <div
              key={ev.id}
              className={`rounded-xl border bg-white p-5 transition relative flex flex-col justify-between ${
                isActive
                  ? 'border-blue-600 shadow-md ring-2 ring-blue-500/20'
                  : 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow'
              }`}
            >
              {isActive && (
                <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold tracking-wide uppercase flex items-center gap-1 shadow">
                  <CheckCircle className="w-3 h-3" />
                  Active Event
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                    {ev.type}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {ev.eventDate}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 line-clamp-1 mb-1">
                  {ev.name}
                </h3>

                <p className="text-xs text-slate-500 flex items-center gap-1 mb-4">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{ev.location}</span>
                </p>

                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 text-xs mb-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Budget
                    </span>
                    <span className="font-bold text-slate-800 font-mono">
                      {formatCurrency(ev.totalBudget, ev.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Guests
                    </span>
                    <span className="font-bold text-slate-800">
                      {ev.guestCount} Attendees
                    </span>
                  </div>
                </div>

                {ev.priorityConsiderations && (
                  <p className="text-[11px] text-slate-600 line-clamp-2 italic mb-3">
                    "{ev.priorityConsiderations}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {!isActive ? (
                  <button
                    onClick={() => onSelectEvent(ev.id)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    Select as Active
                  </button>
                ) : (
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Selected
                  </span>
                )}

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(ev)}
                    className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500"
                    title="Edit event details"
                    aria-label={`Edit ${ev.name}`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {events.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${ev.name}"?`)) {
                          onDeleteEvent(ev.id);
                        }
                      }}
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500"
                      title="Delete event"
                      aria-label={`Delete ${ev.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            ref={modalRef}
            tabIndex={-1}
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto focus:outline-none"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 id="event-modal-title" className="text-lg font-bold text-slate-900">
                {editingEventId ? 'Edit Event Blueprint' : 'Create New Celebration'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer p-1 rounded-md focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label htmlFor="event-name" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Event Name *
                </label>
                <input
                  id="event-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Ananya & Rohan's Royal Traditional Wedding"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="event-type" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Event Type *
                  </label>
                  <select
                    id="event-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as EventType)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Wedding">Wedding</option>
                    <option value="Birthday">Birthday</option>
                    <option value="Anniversary">Anniversary</option>
                    <option value="Corporate event">Corporate event</option>
                    <option value="Community event">Community event</option>
                    <option value="Festival">Festival</option>
                    <option value="Custom event">Custom event</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="event-date" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Target Event Date *
                  </label>
                  <input
                    id="event-date"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="event-location" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Location (City & Venue) *
                </label>
                <input
                  id="event-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Chennai, Tamil Nadu, India"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="event-budget" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Total Budget *
                  </label>
                  <input
                    id="event-budget"
                    type="number"
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(Number(e.target.value))}
                    min="1000"
                    step="1000"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="event-currency" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Currency *
                  </label>
                  <select
                    id="event-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="event-guests" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Guest Count *
                  </label>
                  <input
                    id="event-guests"
                    type="number"
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    min="5"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="event-preferences" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  User Preferences & Style
                </label>
                <textarea
                  id="event-preferences"
                  value={userPreferences}
                  onChange={(e) => setUserPreferences(e.target.value)}
                  placeholder="e.g., Traditional South Indian aesthetics, authentic feast, open-air garden..."
                  rows={2}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="event-special-requirements" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Special Requirements
                </label>
                <input
                  id="event-special-requirements"
                  type="text"
                  value={specialRequirements}
                  onChange={(e) => setSpecialRequirements(e.target.value)}
                  placeholder="e.g., Elderly buggy cart, drone clearance, eco-friendly disposables"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="event-priority" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Priority Considerations (Saved for Intelligent Replanning)
                </label>
                <input
                  id="event-priority"
                  type="text"
                  value={priorityConsiderations}
                  onChange={(e) => setPriorityConsiderations(e.target.value)}
                  placeholder="e.g., Food quality is #1, Photography cannot be cut, Decor can be optimized"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition cursor-pointer"
                >
                  {editingEventId ? 'Save Changes' : 'Initialize Event Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
