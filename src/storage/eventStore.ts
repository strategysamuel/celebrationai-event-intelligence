/**
 * Storage Abstraction Layer
 * CelebrationAI - Event Intelligence Copilot
 *
 * Implements browser persistence (localStorage) with adapter boundary for future DB integration.
 * Supports seeding, CRUD, import, and export.
 */

import { EventPlan } from '../types';
import { SEED_EVENTS } from './seedData';
import { evaluateEventRisks } from '../domain/riskEngine';

const STORAGE_KEY_EVENTS = 'celebrationai_events_cai001';
const STORAGE_KEY_ACTIVE_EVENT = 'celebrationai_active_event_cai001';

export class EventStorageAdapter {
  private static instance: EventStorageAdapter;

  private constructor() {
    this.initializeIfEmpty();
  }

  public static getInstance(): EventStorageAdapter {
    if (!EventStorageAdapter.instance) {
      EventStorageAdapter.instance = new EventStorageAdapter();
    }
    return EventStorageAdapter.instance;
  }

  private initializeIfEmpty(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_EVENTS);
      if (!stored || JSON.parse(stored).length === 0) {
        this.saveAll(SEED_EVENTS);
        this.setActiveEventId(SEED_EVENTS[0].id);
      }
    } catch {
      // Fallback for SSR or non-browser environments
    }
  }

  public getAllEvents(): EventPlan[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_EVENTS);
      if (!raw) return SEED_EVENTS;
      const events: EventPlan[] = JSON.parse(raw);
      // Auto-evaluate risks dynamically
      return events.map((ev) => ({
        ...ev,
        risks: evaluateEventRisks(ev),
      }));
    } catch {
      return SEED_EVENTS;
    }
  }

  public getEventById(id: string): EventPlan | undefined {
    const events = this.getAllEvents();
    return events.find((e) => e.id === id);
  }

  public getActiveEventId(): string {
    try {
      const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_EVENT);
      if (activeId) return activeId;
      const all = this.getAllEvents();
      return all[0]?.id || SEED_EVENTS[0].id;
    } catch {
      return SEED_EVENTS[0].id;
    }
  }

  public setActiveEventId(id: string): void {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_EVENT, id);
    } catch {
      // Ignore
    }
  }

  public saveEvent(event: EventPlan): EventPlan {
    const events = this.getAllEvents();
    const updatedEvent = {
      ...event,
      updatedAt: new Date().toISOString(),
      risks: evaluateEventRisks(event),
    };

    const existingIndex = events.findIndex((e) => e.id === event.id);
    let updatedList: EventPlan[];

    if (existingIndex >= 0) {
      updatedList = [...events];
      updatedList[existingIndex] = updatedEvent;
    } else {
      updatedList = [updatedEvent, ...events];
    }

    this.saveAll(updatedList);
    this.setActiveEventId(updatedEvent.id);
    return updatedEvent;
  }

  public deleteEvent(id: string): boolean {
    const events = this.getAllEvents();
    const filtered = events.filter((e) => e.id !== id);
    if (filtered.length === events.length) return false;

    this.saveAll(filtered);
    if (this.getActiveEventId() === id) {
      if (filtered.length > 0) {
        this.setActiveEventId(filtered[0].id);
      } else {
        // If empty, restore demo
        this.resetToDemoData();
      }
    }
    return true;
  }

  public resetToDemoData(): EventPlan[] {
    this.saveAll(SEED_EVENTS);
    this.setActiveEventId(SEED_EVENTS[0].id);
    return SEED_EVENTS;
  }

  public exportDataAsJSON(): string {
    const data = {
      app: 'CelebrationAI - Event Intelligence Copilot',
      release: 'CAI-001',
      exportedAt: new Date().toISOString(),
      events: this.getAllEvents(),
    };
    return JSON.stringify(data, null, 2);
  }

  public importDataFromJSON(jsonString: string): { success: boolean; count: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      const incomingEvents: EventPlan[] = Array.isArray(parsed) ? parsed : parsed.events;

      if (!Array.isArray(incomingEvents) || incomingEvents.length === 0) {
        return { success: false, count: 0, error: 'Invalid JSON format: no events array found.' };
      }

      // Validate required fields
      for (const ev of incomingEvents) {
        const isDateValid = ev.eventDate && !isNaN(new Date(ev.eventDate).getTime());
        if (
          !ev.id ||
          typeof ev.name !== 'string' ||
          !ev.name.trim() ||
          !isDateValid ||
          typeof ev.totalBudget !== 'number' ||
          ev.totalBudget < 0
        ) {
          return { success: false, count: 0, error: `Invalid event payload in item: ${ev?.name || 'Unnamed'}` };
        }
      }

      this.saveAll(incomingEvents);
      this.setActiveEventId(incomingEvents[0].id);
      return { success: true, count: incomingEvents.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message || 'Malformed JSON file.' };
    }
  }

  private saveAll(events: EventPlan[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
    } catch (e) {
      console.error('Failed to persist to localStorage', e);
    }
  }
}

export const eventStore = EventStorageAdapter.getInstance();
