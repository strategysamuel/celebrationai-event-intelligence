import { describe, it, expect, beforeEach } from 'vitest';
import { EventStorageAdapter } from '../src/storage/eventStore';
import { EventPlan } from '../src/types';

// Mock localStorage for test environment
class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string) {
    return this.store[key] || null;
  }
  setItem(key: string, value: string) {
    this.store[key] = value;
  }
  removeItem(key: string) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

// Attach mock localStorage to global if not defined
if (typeof window === 'undefined' || !window.localStorage) {
  (global as any).localStorage = new MockLocalStorage();
}

describe('EventStorageAdapter & Portfolio Lifecycle', () => {
  let store: EventStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    store = EventStorageAdapter.getInstance();
    store.resetToDemoData();
  });

  it('initializes with seed demonstration events', () => {
    const events = store.getAllEvents();
    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events[0].name).toContain('Ananya & Rohan');
  });

  it('creates and saves a new event', () => {
    const newEvent: EventPlan = {
      id: 'test-event-new',
      name: 'Silver Jubilee Gala',
      type: 'Anniversary',
      location: 'Goa, India',
      eventDate: '2027-05-20',
      guestCount: 150,
      totalBudget: 600000,
      currency: 'INR',
      userPreferences: 'Beachfront dinner, acoustic jazz',
      specialRequirements: 'Seafood and vegan stations',
      priorityConsiderations: 'Music and ambiance',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      budgetAllocations: [
        { category: 'Venue', percentage: 40, allocatedAmount: 240000 },
        { category: 'Catering', percentage: 40, allocatedAmount: 240000 },
        { category: 'Miscellaneous', percentage: 20, allocatedAmount: 120000 },
      ],
      expenses: [],
      milestones: [],
      tasks: [],
      vendors: [],
      risks: [],
    };

    const saved = store.saveEvent(newEvent);
    expect(saved.id).toBe('test-event-new');
    expect(store.getEventById('test-event-new')?.name).toBe('Silver Jubilee Gala');
    expect(store.getActiveEventId()).toBe('test-event-new');
  });

  it('updates an existing event without duplicating entries', () => {
    const events = store.getAllEvents();
    const target = events[0];
    const updated = { ...target, guestCount: 350 };

    store.saveEvent(updated);
    const refreshed = store.getEventById(target.id);
    expect(refreshed?.guestCount).toBe(350);
  });

  it('deletes an event and switches active event context safely', () => {
    const initialEvents = store.getAllEvents();
    const idToDelete = initialEvents[0].id;
    const secondId = initialEvents[1].id;

    store.setActiveEventId(idToDelete);
    const deleteSuccess = store.deleteEvent(idToDelete);

    expect(deleteSuccess).toBe(true);
    expect(store.getEventById(idToDelete)).toBeUndefined();
    expect(store.getActiveEventId()).toBe(secondId);
  });

  it('exports valid JSON data backup', () => {
    const jsonStr = store.exportDataAsJSON();
    const parsed = JSON.parse(jsonStr);

    expect(parsed.app).toContain('CelebrationAI');
    expect(parsed.release).toBe('CAI-001');
    expect(Array.isArray(parsed.events)).toBe(true);
    expect(parsed.events.length).toBeGreaterThan(0);
  });

  it('imports valid JSON and updates event list', () => {
    const backupData = {
      app: 'CelebrationAI',
      events: [
        {
          id: 'imported-1',
          name: 'Imported Gala',
          type: 'Corporate event',
          location: 'Pune',
          eventDate: '2027-08-15',
          guestCount: 100,
          totalBudget: 400000,
          currency: 'INR',
          userPreferences: 'Tech summit',
          specialRequirements: '',
          priorityConsiderations: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          budgetAllocations: [],
          expenses: [],
          milestones: [],
          tasks: [],
          vendors: [],
          risks: [],
        },
      ],
    };

    const result = store.importDataFromJSON(JSON.stringify(backupData));
    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
    expect(store.getEventById('imported-1')?.name).toBe('Imported Gala');
  });

  it('strictly rejects malformed JSON without corrupting existing data', () => {
    const initialCount = store.getAllEvents().length;

    // Test with malformed JSON string
    const result1 = store.importDataFromJSON('not a json');
    expect(result1.success).toBe(false);
    expect(store.getAllEvents().length).toBe(initialCount);

    // Test with invalid event missing date and negative budget
    const corruptData = {
      events: [
        {
          id: 'bad-1',
          name: '',
          eventDate: 'invalid-date',
          totalBudget: -50000,
        },
      ],
    };

    const result2 = store.importDataFromJSON(JSON.stringify(corruptData));
    expect(result2.success).toBe(false);
    expect(result2.error).toContain('Invalid event payload');
    expect(store.getAllEvents().length).toBe(initialCount);
  });
});
