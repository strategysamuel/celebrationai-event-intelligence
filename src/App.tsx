/**
 * CelebrationAI – Event Intelligence Copilot
 * Main Application Shell & State Controller
 * Vertical: Celebration & Event Planner | Release: CAI-001 | PromptWars 2026
 */

import React, { useState, useEffect } from 'react';
import { EventPlan, CurrencyCode } from './types';
import { eventStore } from './storage/eventStore';
import { apiClient } from './services/apiClient';
import { Header } from './components/Header';
import { Sidebar, NavSection } from './components/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { EventsView } from './components/views/EventsView';
import { CopilotView } from './components/views/CopilotView';
import { CelebrationIntelligenceView } from './components/views/CelebrationIntelligenceView';
import { BudgetView } from './components/views/BudgetView';
import { TimelineView } from './components/views/TimelineView';
import { VendorView } from './components/views/VendorView';
import { VendorProcurementView } from './components/views/VendorProcurementView';
import { ExecutionMonitoringView } from './components/views/ExecutionMonitoringView';
import { RiskView } from './components/views/RiskView';
import { ReplanningView } from './components/views/ReplanningView';
import { ReportsView } from './components/views/ReportsView';
import { SettingsView } from './components/views/SettingsView';

export default function App() {
  const [events, setEvents] = useState<EventPlan[]>(() => eventStore.getAllEvents());
  const [activeEventId, setActiveEventId] = useState<string>(() => eventStore.getActiveEventId());
  const [currentSection, setCurrentSection] = useState<NavSection>('overview');
  const [geminiModel, setGeminiModel] = useState<string>('gemini-3.8-flash');
  const [isAiOnline, setIsAiOnline] = useState<boolean>(false);

  // Check health and model configuration on mount
  useEffect(() => {
    apiClient
      .getHealth()
      .then((res) => {
        if (res.geminiModel) setGeminiModel(res.geminiModel);
        setIsAiOnline(res.apiKeyConfigured);
      })
      .catch(() => {
        // Fallback gracefully
        setIsAiOnline(false);
      });
  }, []);

  // Sync active event
  const activeEvent =
    events.find((e) => e.id === activeEventId) || events[0] || eventStore.getAllEvents()[0];

  const handleSelectEvent = (id: string) => {
    setActiveEventId(id);
    eventStore.setActiveEventId(id);
  };

  const handleSaveEvent = (updatedEvent: EventPlan) => {
    const saved = eventStore.saveEvent(updatedEvent);
    const refreshed = eventStore.getAllEvents();
    setEvents(refreshed);
    setActiveEventId(saved.id);
  };

  const handleDeleteEvent = (id: string) => {
    eventStore.deleteEvent(id);
    const refreshed = eventStore.getAllEvents();
    setEvents(refreshed);
    setActiveEventId(eventStore.getActiveEventId());
  };

  const handleExportJSON = () => {
    const jsonStr = eventStore.exportDataAsJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `celebrationai-portfolio-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (jsonString: string) => {
    const result = eventStore.importDataFromJSON(jsonString);
    if (result.success) {
      const refreshed = eventStore.getAllEvents();
      setEvents(refreshed);
      setActiveEventId(eventStore.getActiveEventId());
      alert(`Successfully imported ${result.count} event(s)!`);
    } else {
      alert(`Import error: ${result.error}`);
    }
  };

  const handleResetDemoData = () => {
    const demo = eventStore.resetToDemoData();
    setEvents(demo);
    setActiveEventId(demo[0].id);
  };

  const handleUpdateCurrency = (currency: CurrencyCode) => {
    if (!activeEvent) return;
    const updated: EventPlan = {
      ...activeEvent,
      currency,
      updatedAt: new Date().toISOString(),
    };
    handleSaveEvent(updated);
  };

  // Badges
  const openRiskCount = activeEvent?.risks?.filter((r) => r.status !== 'Resolved').length || 0;
  const pendingTaskCount =
    activeEvent?.tasks?.filter((t) => t.status !== 'Completed').length || 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-teal-500 selection:text-white">
      {/* Top Application Header */}
      <Header
        events={events}
        activeEvent={activeEvent}
        onSelectEvent={handleSelectEvent}
        onOpenCreateModal={() => setCurrentSection('events')}
        onNavigateToReplanning={() => setCurrentSection('replanning')}
        isAiOnline={isAiOnline}
        geminiModel={geminiModel}
      />

      {/* Main Layout Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentSection={currentSection}
          onSelectSection={setCurrentSection}
          openRiskCount={openRiskCount}
          pendingTaskCount={pendingTaskCount}
        />

        {/* Viewport Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {currentSection === 'overview' && (
              <DashboardView
                activeEvent={activeEvent}
                allEvents={events}
                onNavigate={setCurrentSection}
              />
            )}

            {currentSection === 'events' && (
              <EventsView
                events={events}
                activeEvent={activeEvent}
                onSelectEvent={handleSelectEvent}
                onSaveEvent={handleSaveEvent}
                onDeleteEvent={handleDeleteEvent}
                onExportJSON={handleExportJSON}
                onImportJSON={handleImportJSON}
              />
            )}

            {currentSection === 'copilot' && (
              <CopilotView
                activeEvent={activeEvent}
                onApplyPlan={handleSaveEvent}
                geminiModel={geminiModel}
              />
            )}

            {currentSection === 'intelligence' && (
              <CelebrationIntelligenceView
                activeEvent={activeEvent}
                onApplyPlan={handleSaveEvent}
                geminiModel={geminiModel}
              />
            )}

            {currentSection === 'budget' && (
              <BudgetView
                activeEvent={activeEvent}
                onUpdateEvent={handleSaveEvent}
              />
            )}

            {currentSection === 'timeline' && (
              <TimelineView
                activeEvent={activeEvent}
                onUpdateEvent={handleSaveEvent}
              />
            )}

            {currentSection === 'vendors' && (
              <VendorView
                activeEvent={activeEvent}
                onUpdateEvent={handleSaveEvent}
              />
            )}

            {currentSection === 'procurement' && (
              <VendorProcurementView />
            )}

            {currentSection === 'execution' && (
              <ExecutionMonitoringView
                event={activeEvent}
                onUpdateEvent={handleSaveEvent}
              />
            )}

            {currentSection === 'risks' && (
              <RiskView
                activeEvent={activeEvent}
                onUpdateEvent={handleSaveEvent}
              />
            )}

            {currentSection === 'replanning' && (
              <ReplanningView
                activeEvent={activeEvent}
                onApplyPlan={handleSaveEvent}
              />
            )}

            {currentSection === 'reports' && (
              <ReportsView activeEvent={activeEvent} />
            )}

            {currentSection === 'settings' && (
              <SettingsView
                activeEvent={activeEvent}
                onUpdateCurrency={handleUpdateCurrency}
                onResetDemoData={handleResetDemoData}
                geminiModel={geminiModel}
                isAiOnline={isAiOnline}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
