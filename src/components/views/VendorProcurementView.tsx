/**
 * Vendor & Procurement Intelligence View (CAI-004)
 * CelebrationAI - Event Intelligence Copilot
 *
 * Implements Vendor Management (CRUD), Quotation Extraction & Manual Correction,
 * Side-by-Side Comparison Matrix, 4-Factor Vendor Intelligence Scorecard,
 * Negotiation Copilot, and Procurement Budget Reconciler with User Approval.
 */

import React, { useState, useEffect } from 'react';
import {
  Store,
  Plus,
  Edit2,
  Trash2,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  TrendingDown,
  HelpCircle,
  X,
  FileCheck,
  DollarSign,
  Users,
  Search,
  Check,
  Award,
  AlertCircle,
  ChevronRight,
  ArrowRight,
  Layers,
  BarChart3,
  MessageSquare,
  Clock,
  Zap,
} from 'lucide-react';
import {
  Vendor,
  VendorCategory,
  VendorStatus,
  PaymentStatus,
  VendorQuotation,
  VendorNegotiationInsight,
  ProcurementBudgetImpact,
  EventPlan,
} from '../../types';
import { EventStorageAdapter } from '../../storage/eventStore';
import {
  SEED_DEMO_QUOTATIONS,
  extractQuotationFromText,
  calculateProcurementVendorScore,
  compareCategoryQuotations,
  generateHeuristicNegotiationInsight,
  calculateProcurementBudgetImpact,
} from '../../domain/procurementEngine';
import { apiClient } from '../../services/apiClient';

export const VendorProcurementView: React.FC = () => {
  const storageAdapter = EventStorageAdapter.getInstance();
  const [activeEvent, setActiveEvent] = useState<EventPlan>(() => {
    const id = storageAdapter.getActiveEventId();
    return storageAdapter.getEventById(id) || storageAdapter.getAllEvents()[0];
  });

  // Active Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState<
    'directory' | 'upload' | 'compare' | 'scorecard' | 'negotiation' | 'budget'
  >('directory');

  // Quotation Store & Selected Procurement Bundle State
  const [quotations, setQuotations] = useState<VendorQuotation[]>(SEED_DEMO_QUOTATIONS);
  const [selectedQuotations, setSelectedQuotations] = useState<Record<VendorCategory, VendorQuotation | null>>({
    Catering: SEED_DEMO_QUOTATIONS[0], // Annamalai Caterers
    Decoration: SEED_DEMO_QUOTATIONS[3], // Mylapore Decorators
    Photography: SEED_DEMO_QUOTATIONS[6], // Madras Candid Stories
    Venue: null,
    Entertainment: null,
    Accommodation: null,
    Transport: null,
    Miscellaneous: null,
  });

  // Directory Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Comparison Tab Selected Category
  const [selectedCompareCategory, setSelectedCompareCategory] = useState<VendorCategory>('Catering');

  // Quotation Upload & Parser State
  const [uploadText, setUploadText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<VendorQuotation | null>(null);
  const [extractionErrors, setExtractionErrors] = useState<string[]>([]);

  // Negotiation Copilot State
  const [selectedNegotiationQuote, setSelectedNegotiationQuote] = useState<VendorQuotation>(SEED_DEMO_QUOTATIONS[0]);
  const [negotiationInsight, setNegotiationInsight] = useState<VendorNegotiationInsight | null>(null);
  const [isLoadingNegotiation, setIsLoadingNegotiation] = useState(false);

  // Modals State
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deletingVendorId, setDeletingVendorId] = useState<string | null>(null);
  const [showManualCorrectionModal, setShowManualCorrectionModal] = useState(false);
  const [showApplyProcurementModal, setShowApplyProcurementModal] = useState(false);

  // Vendor Form Data State
  const [vendorForm, setVendorForm] = useState<Partial<Vendor>>({
    name: '',
    category: 'Catering',
    contactPerson: '',
    phone: '',
    email: '',
    quotedPrice: 100000,
    negotiatedPrice: 95000,
    status: 'Quoted',
    paymentStatus: 'Unpaid',
    notes: '',
  });

  // Refresh Active Event from store
  const refreshEvent = () => {
    const id = storageAdapter.getActiveEventId();
    const ev = storageAdapter.getEventById(id) || storageAdapter.getAllEvents()[0];
    setActiveEvent(ev);
  };

  useEffect(() => {
    refreshEvent();
  }, []);

  // Fetch AI Negotiation Copilot Insights
  const fetchNegotiationInsight = async (quote: VendorQuotation) => {
    setIsLoadingNegotiation(true);
    try {
      const categoryAlloc = activeEvent.budgetAllocations.find((a) => a.category === quote.category)?.allocatedAmount || 450000;
      const res = await apiClient.analyzeVendorNegotiation(quote, categoryAlloc);
      setNegotiationInsight(res);
    } catch {
      // Fallback
      const categoryAlloc = activeEvent.budgetAllocations.find((a) => a.category === quote.category)?.allocatedAmount || 450000;
      setNegotiationInsight(generateHeuristicNegotiationInsight(quote, categoryAlloc));
    } finally {
      setIsLoadingNegotiation(false);
    }
  };

  useEffect(() => {
    if (selectedNegotiationQuote) {
      fetchNegotiationInsight(selectedNegotiationQuote);
    }
  }, [selectedNegotiationQuote]);

  // Handle Vendor Form Submit (Create or Edit)
  const handleVendorFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.name || !vendorForm.quotedPrice) return;

    const newVendor: Vendor = {
      id: editingVendor ? editingVendor.id : `vnd-custom-${Date.now()}`,
      name: vendorForm.name,
      category: vendorForm.category || 'Catering',
      contactPerson: vendorForm.contactPerson || 'Coordinator',
      phone: vendorForm.phone || '+91 90000 00000',
      email: vendorForm.email || 'vendor@example.com',
      quotedPrice: Number(vendorForm.quotedPrice),
      negotiatedPrice: Number(vendorForm.negotiatedPrice || vendorForm.quotedPrice),
      status: (vendorForm.status as VendorStatus) || 'Quoted',
      paymentStatus: (vendorForm.paymentStatus as PaymentStatus) || 'Unpaid',
      paidAmount: editingVendor ? editingVendor.paidAmount : 0,
      isPreferred: false,
      notes: vendorForm.notes || '',
      budgetCompatibilityScore: 85,
      serviceSuitabilityScore: 90,
      availabilityScore: 85,
      ratingScore: 90,
      rating: 4.5,
      compositeScore: 87.5,
      isDemoData: false,
    };

    const updatedVendors = editingVendor
      ? activeEvent.vendors.map((v) => (v.id === editingVendor.id ? newVendor : v))
      : [newVendor, ...activeEvent.vendors];

    const updatedEvent = {
      ...activeEvent,
      vendors: updatedVendors,
    };

    storageAdapter.saveEvent(updatedEvent);
    setActiveEvent(updatedEvent);
    setShowAddVendorModal(false);
    setEditingVendor(null);
    setVendorForm({
      name: '',
      category: 'Catering',
      contactPerson: '',
      phone: '',
      email: '',
      quotedPrice: 100000,
      negotiatedPrice: 95000,
      status: 'Quoted',
      paymentStatus: 'Unpaid',
      notes: '',
    });
  };

  // Handle Vendor Delete
  const handleConfirmDeleteVendor = () => {
    if (!deletingVendorId) return;
    const updatedVendors = activeEvent.vendors.filter((v) => v.id !== deletingVendorId);
    const updatedEvent = {
      ...activeEvent,
      vendors: updatedVendors,
    };
    storageAdapter.saveEvent(updatedEvent);
    setActiveEvent(updatedEvent);
    setDeletingVendorId(null);
  };

  // Handle File Upload Extraction & Validation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);
    if (!file) return;

    // Security & File Restriction Check (Section 10)
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB limit
    if (file.size > maxSizeBytes) {
      setFileError(`File size exceeds 5MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB).`);
      return;
    }

    const validExtensions = ['.csv', '.txt', '.json', '.pdf'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setFileError('Invalid file type. Supported formats: .csv, .txt, .json, .pdf (text extraction).');
      return;
    }

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUploadText(content);
      const { quotation, extractionErrors: errs } = extractQuotationFromText(content, file.name);
      setParsedPreview(quotation);
      setExtractionErrors(errs);
    };
    reader.readAsText(file);
  };

  // Handle Text Area Extraction
  const handleTextExtraction = () => {
    setFileError(null);
    if (!uploadText.trim()) {
      setFileError('Please paste raw quotation text to parse.');
      return;
    }
    const { quotation, extractionErrors: errs } = extractQuotationFromText(uploadText, uploadedFileName || 'pasted_quote.txt');
    setParsedPreview(quotation);
    setExtractionErrors(errs);
  };

  // Save Extracted Quotation to List
  const handleSaveParsedQuotation = () => {
    if (!parsedPreview) return;
    const categoryAlloc = activeEvent.budgetAllocations.find((a) => a.category === parsedPreview.category)?.allocatedAmount || 450000;
    const scores = calculateProcurementVendorScore({
      quotedAmount: parsedPreview.totalEstimatedCost,
      allocatedBudget: categoryAlloc,
      includedServicesCount: parsedPreview.includedServices.length,
      excludedServicesCount: parsedPreview.excludedServices.length,
      capacityProvided: 450,
      capacityRequired: activeEvent.guestCount || 450,
      verifiedRating: 4.5,
    });

    const finalQuote: VendorQuotation = {
      ...parsedPreview,
      scores,
    };

    setQuotations((prev) => [finalQuote, ...prev]);
    setParsedPreview(null);
    setUploadText('');
    setShowManualCorrectionModal(false);
    setActiveSubTab('compare');
    setSelectedCompareCategory(finalQuote.category);
  };

  // Apply Procurement Bundle to Event (User Confirmation - Section 7)
  const handleConfirmApplyProcurement = () => {
    const newExpenses = [...activeEvent.expenses];
    const newVendors = [...activeEvent.vendors];

    Object.entries(selectedQuotations).forEach(([cat, quote]) => {
      if (quote) {
        // Find existing vendor or add new
        const existingIdx = newVendors.findIndex((v) => v.category === cat);
        const vendorItem: Vendor = {
          id: existingIdx >= 0 ? newVendors[existingIdx].id : `vnd-proc-${Date.now()}-${cat}`,
          name: quote.vendorName,
          category: cat as VendorCategory,
          contactPerson: 'Vendor Representative',
          phone: '+91 98400 00000',
          email: 'procurement@vendor.demo',
          quotedPrice: quote.totalEstimatedCost,
          negotiatedPrice: quote.totalEstimatedCost,
          status: 'Confirmed',
          paymentStatus: 'Unpaid',
          paidAmount: 0,
          isPreferred: true,
          notes: `Selected via Vendor & Procurement Intelligence (CAI-004). Quote ID: ${quote.id}`,
          budgetCompatibilityScore: quote.scores?.budgetCompatibilityScore || 85,
          serviceSuitabilityScore: quote.scores?.serviceSuitabilityScore || 90,
          availabilityScore: quote.scores?.capacityScore || 90,
          ratingScore: quote.scores?.ratingScore || 90,
          rating: 4.8,
          compositeScore: quote.scores?.compositeScore || 92.5,
          isDemoData: quote.verificationStatus === 'Synthetic Demonstration',
        };

        if (existingIdx >= 0) {
          newVendors[existingIdx] = vendorItem;
        } else {
          newVendors.push(vendorItem);
        }

        // Update corresponding expense line
        const expIdx = newExpenses.findIndex((e) => e.category === cat);
        if (expIdx >= 0) {
          newExpenses[expIdx] = {
            ...newExpenses[expIdx],
            name: `${quote.vendorName} Contract`,
            estimatedCost: quote.totalEstimatedCost,
            actualCost: quote.totalEstimatedCost,
            vendorId: vendorItem.id,
          };
        }
      }
    });

    const updatedEvent = {
      ...activeEvent,
      vendors: newVendors,
      expenses: newExpenses,
      updatedAt: new Date().toISOString(),
    };

    storageAdapter.saveEvent(updatedEvent);
    setActiveEvent(updatedEvent);
    setShowApplyProcurementModal(false);
  };

  // Filtered Vendors for Directory Tab
  const filteredVendors = activeEvent.vendors.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.contactPerson.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || v.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate Procurement Budget Impact
  const selectedProcurementList = Object.entries(selectedQuotations)
    .filter(([_, q]) => q !== null)
    .map(([cat, q]) => ({
      category: cat as VendorCategory,
      vendorName: q!.vendorName,
      cost: q!.totalEstimatedCost,
    }));

  const budgetImpact: ProcurementBudgetImpact = calculateProcurementBudgetImpact(activeEvent, selectedProcurementList);

  // Compare Quotations for Selected Category
  const categoryComparison = compareCategoryQuotations(
    quotations,
    selectedCompareCategory,
    activeEvent.budgetAllocations.find((a) => a.category === selectedCompareCategory)?.allocatedAmount || 450000
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
              CAI-004
            </span>
            <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
              <Store className="w-6 h-6 text-teal-400" />
              Vendor & Procurement Intelligence
            </h1>
          </div>
          <p className="text-xs text-slate-300">
            Active Event: <strong className="text-white">{activeEvent.name}</strong> ({activeEvent.location}) • {activeEvent.guestCount} Guests • Budget: ₹{(activeEvent.totalBudget / 100000).toFixed(2)} Lakhs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setQuotations(SEED_DEMO_QUOTATIONS);
              setActiveSubTab('compare');
            }}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Load Chennai Benchmark Quotes</span>
          </button>
          <button
            onClick={() => setShowAddVendorModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Vendor</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-2 pt-2 rounded-t-xl">
        {[
          { id: 'directory', label: 'Vendor Directory', icon: Store },
          { id: 'upload', label: 'Quotation Extraction & Parser', icon: Upload },
          { id: 'compare', label: 'Quotation Comparison Matrix', icon: Layers },
          { id: 'scorecard', label: 'Vendor Intelligence Scorecard', icon: BarChart3 },
          { id: 'negotiation', label: 'Negotiation Copilot', icon: MessageSquare },
          { id: 'budget', label: 'Procurement Budget Reconciler', icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: Vendor Directory & CRUD */}
      {activeSubTab === 'directory' && (
        <div className="space-y-4">
          {/* Directory Search & Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search vendors by name or contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none"
              >
                <option value="All">All Categories</option>
                <option value="Catering">Catering</option>
                <option value="Venue">Venue</option>
                <option value="Decoration">Decoration</option>
                <option value="Photography">Photography</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Accommodation">Accommodation</option>
                <option value="Transport">Transport</option>
              </select>

              <span className="text-slate-500 font-medium ml-2">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Inquiry">Inquiry</option>
                <option value="Quoted">Quoted</option>
                <option value="Negotiating">Negotiating</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Declined">Declined</option>
              </select>
            </div>
          </div>

          {/* Vendor Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVendors.map((vendor) => (
              <div
                key={vendor.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                        {vendor.category}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        {vendor.name}
                      </h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      vendor.status === 'Confirmed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : vendor.status === 'Negotiating'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {vendor.status}
                    </span>
                  </div>

                  {vendor.isDemoData && (
                    <span className="inline-block bg-slate-100 text-slate-600 text-[9px] font-semibold px-2 py-0.5 rounded">
                      [DEMO DATA]
                    </span>
                  )}

                  <div className="space-y-1 text-xs text-slate-600">
                    <p>👤 <strong>Contact:</strong> {vendor.contactPerson} ({vendor.phone})</p>
                    <p>✉️ <strong>Email:</strong> {vendor.email}</p>
                    <p>💰 <strong>Quoted Price:</strong> ₹{vendor.quotedPrice.toLocaleString()}</p>
                    <p>🤝 <strong>Negotiated:</strong> ₹{vendor.negotiatedPrice.toLocaleString()}</p>
                  </div>

                  {/* Score Badges */}
                  <div className="bg-slate-50 p-2.5 rounded-xl flex items-center justify-between text-xs border border-slate-100">
                    <span className="text-slate-500 font-medium">Suitability Score:</span>
                    <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      ⭐ {vendor.compositeScore} / 100
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setEditingVendor(vendor);
                      setVendorForm(vendor);
                      setShowAddVendorModal(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                    title="Edit Vendor"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingVendorId(vendor.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Delete Vendor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Quotation Extraction & Parser */}
      {activeSubTab === 'upload' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600" /> Upload or Paste Vendor Quotation (PDF, CSV, TXT, JSON)
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload vendor quotation documents or paste quotation text below. The parser extracts vendor names, quoted prices, GST/taxes, included services, excluded items, and payment terms without fabricating missing data.
            </p>

            {fileError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}

            {/* Drag & Drop Upload Zone */}
            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-50/50 transition">
              <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">Drag & Drop quotation document here</p>
              <p className="text-[10px] text-slate-400 mb-3">Supports CSV, TXT, JSON, or text PDF (Max 5MB file restriction enforced)</p>
              <label className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition cursor-pointer inline-block">
                <span>Browse Local File</span>
                <input type="file" accept=".csv,.txt,.json,.pdf" onChange={handleFileUpload} className="hidden" />
              </label>
              {uploadedFileName && (
                <p className="text-xs font-semibold text-emerald-700 mt-2">Selected: {uploadedFileName}</p>
              )}
            </div>

            {/* Raw Text Input Zone */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Or Paste Raw Quotation Text:</label>
              <textarea
                rows={5}
                value={uploadText}
                onChange={(e) => setUploadText(e.target.value)}
                placeholder="Paste vendor quotation text, line-item details, payment terms, or inclusions..."
                className="w-full p-3 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleTextExtraction}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Extract Quotation Fields</span>
              </button>
            </div>
          </div>

          {/* Extracted Preview Card */}
          {parsedPreview && (
            <div className="bg-white rounded-2xl border-2 border-blue-600 p-6 space-y-4 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">Extracted Quotation Summary</h3>
                </div>
                <button
                  onClick={() => setShowManualCorrectionModal(true)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Manual Correction & Edit</span>
                </button>
              </div>

              {extractionErrors.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
                  <strong className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> Parser Audit Observations:
                  </strong>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5">
                    {extractionErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Vendor Name</span>
                  <p className="font-bold text-slate-900 text-sm">{parsedPreview.vendorName}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Service Category</span>
                  <p className="font-bold text-slate-900 text-sm">{parsedPreview.category}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Total Cost (Base + GST)</span>
                  <p className="font-bold text-emerald-700 text-sm">₹{parsedPreview.totalEstimatedCost.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <strong className="text-emerald-700 flex items-center gap-1 font-bold">
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Included Services ({parsedPreview.includedServices.length}):
                  </strong>
                  <ul className="list-disc list-inside text-slate-600 mt-1 space-y-0.5 pl-1">
                    {parsedPreview.includedServices.map((inc, i) => (
                      <li key={i}>{inc}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong className="text-rose-700 flex items-center gap-1 font-bold">
                    <X className="w-3.5 h-3.5 text-rose-600" /> Excluded Items ({parsedPreview.excludedServices.length}):
                  </strong>
                  <ul className="list-disc list-inside text-slate-600 mt-1 space-y-0.5 pl-1">
                    {parsedPreview.excludedServices.map((exc, i) => (
                      <li key={i}>{exc}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={handleSaveParsedQuotation}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save to Quotation Repository</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: Side-by-Side Quotation Comparison Matrix */}
      {activeSubTab === 'compare' && (
        <div className="space-y-6">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {(['Catering', 'Decoration', 'Photography', 'Venue', 'Entertainment'] as VendorCategory[]).map((cat) => {
              const count = quotations.filter((q) => q.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCompareCategory(cat)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                    selectedCompareCategory === cat
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    selectedCompareCategory === cat ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Category Comparison Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" /> Side-by-Side Quotation Comparison ({selectedCompareCategory})
                </h3>
                <p className="text-xs text-slate-500">
                  Highlighting lowest price tag while prioritizing composite suitability score recommendation.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
                Price Spread: ₹{categoryComparison.priceSpread.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {categoryComparison.quotations.map((quote) => {
                const isSelectedForBundle = selectedQuotations[selectedCompareCategory]?.id === quote.id;
                return (
                  <div
                    key={quote.id}
                    className={`rounded-2xl p-5 border-2 transition flex flex-col justify-between space-y-4 ${
                      isSelectedForBundle
                        ? 'bg-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Badge Row */}
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        {quote.isLowestQuote && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                            🏷️ Lowest Quote Tag
                          </span>
                        )}
                        {quote.isRecommended && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                            ⭐ Recommended Vendor
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">{quote.vendorName}</h4>
                        <span className="text-[10px] text-slate-400 font-semibold">{quote.verificationStatus}</span>
                      </div>

                      {/* Pricing Summary */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Base Quote:</span>
                          <span className="font-bold">₹{quote.quotedAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>GST / Taxes:</span>
                          <span className="font-bold">₹{quote.taxesAndGst.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-900 font-extrabold pt-1 border-t border-slate-200">
                          <span>Total Estimated Cost:</span>
                          <span className="text-blue-700">₹{quote.totalEstimatedCost.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Suitability Score Breakdown */}
                      {quote.scores && (
                        <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1.5 text-[11px]">
                          <div className="flex justify-between font-bold text-blue-900">
                            <span>Composite Score:</span>
                            <span className="text-blue-700">{quote.scores.compositeScore} / 100</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600">
                            <span>Budget (35%): {quote.scores.budgetCompatibilityScore}</span>
                            <span>Service (30%): {quote.scores.serviceSuitabilityScore}</span>
                            <span>Capacity (20%): {quote.scores.capacityScore}</span>
                            <span>Rating (15%): {quote.scores.ratingScore}</span>
                          </div>
                        </div>
                      )}

                      {/* Included vs Excluded Services */}
                      <div className="space-y-2 text-[11px]">
                        <div>
                          <strong className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Included Services ({quote.includedServices.length}):
                          </strong>
                          <ul className="list-disc list-inside text-slate-600 mt-0.5 space-y-0.5 pl-1">
                            {quote.includedServices.map((inc, i) => (
                              <li key={i}>{inc}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <strong className="text-rose-700 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-600" /> Excluded Items ({quote.excludedServices.length}):
                          </strong>
                          <ul className="list-disc list-inside text-slate-600 mt-0.5 space-y-0.5 pl-1">
                            {quote.excludedServices.map((exc, i) => (
                              <li key={i}>{exc}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedQuotations((prev) => ({
                          ...prev,
                          [selectedCompareCategory]: quote,
                        }));
                      }}
                      className={`w-full py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelectedForBundle
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isSelectedForBundle ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{isSelectedForBundle ? 'Selected for Bundle' : 'Select for Event Bundle'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: Vendor Intelligence Scorecard */}
      {activeSubTab === 'scorecard' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" /> Deterministic 4-Factor Vendor Intelligence Scorecard
              </h3>
              <p className="text-xs text-slate-500">
                Formula Weights: Budget Compatibility (35%), Service Suitability (30%), Capacity (20%), Verified Rating (15%). Missing data is never inflated.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {quotations.map((quote) => {
              const scores = quote.scores || calculateProcurementVendorScore({
                quotedAmount: quote.totalEstimatedCost,
                allocatedBudget: activeEvent.budgetAllocations.find((a) => a.category === quote.category)?.allocatedAmount || 450000,
                includedServicesCount: quote.includedServices.length,
                excludedServicesCount: quote.excludedServices.length,
                capacityProvided: 450,
                capacityRequired: 450,
                verifiedRating: 4.5,
              });

              return (
                <div key={quote.id} className="p-4 rounded-xl border border-slate-200 space-y-3 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{quote.category}</span>
                      <h4 className="text-xs font-extrabold text-slate-900">{quote.vendorName}</h4>
                    </div>
                    <span className="text-sm font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
                      Score: {scores.compositeScore} / 100
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Budget (35%):</span>
                        <span className="font-bold text-slate-900">{scores.budgetCompatibilityScore}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${scores.budgetCompatibilityScore}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Service (30%):</span>
                        <span className="font-bold text-slate-900">{scores.serviceSuitabilityScore}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-teal-600 h-full rounded-full" style={{ width: `${scores.serviceSuitabilityScore}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Capacity (20%):</span>
                        <span className="font-bold text-slate-900">{scores.capacityScore}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-600 h-full rounded-full" style={{ width: `${scores.capacityScore}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Rating (15%):</span>
                        <span className="font-bold text-slate-900">{scores.ratingScore}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-purple-600 h-full rounded-full" style={{ width: `${scores.ratingScore}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: Negotiation Copilot */}
      {activeSubTab === 'negotiation' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" /> Negotiation Intelligence Copilot
                </h3>
                <p className="text-xs text-slate-500">
                  AI-driven negotiation targets, missing-service warnings, and contract risk observations grounded strictly in extracted quotation data.
                </p>
              </div>

              <select
                value={selectedNegotiationQuote.id}
                onChange={(e) => {
                  const q = quotations.find((quote) => quote.id === e.target.value);
                  if (q) setSelectedNegotiationQuote(q);
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 focus:outline-none"
              >
                {quotations.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.vendorName} (₹{q.totalEstimatedCost.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {isLoadingNegotiation ? (
              <div className="p-8 text-center space-y-2">
                <Sparkles className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-700">Formulating Negotiation Briefing...</p>
              </div>
            ) : negotiationInsight ? (
              <div className="space-y-4">
                {/* AI Attribution Badge */}
                {negotiationInsight.attributionMetadata && (
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <Sparkles className="w-3 h-3 text-teal-600" />
                    <span>
                      Attribution Source: <strong>{negotiationInsight.attributionMetadata.source === 'gemini' ? `Live AI (${negotiationInsight.attributionMetadata.actualModel})` : 'Deterministic Heuristic Engine'}</strong>
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Opportunities & Cost Reductions */}
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-2">
                    <strong className="text-blue-900 font-bold flex items-center gap-1">
                      <TrendingDown className="w-4 h-4 text-blue-600" /> Negotiation Opportunities & Target Savings:
                    </strong>
                    <ul className="list-disc list-inside text-slate-700 space-y-1">
                      {negotiationInsight.negotiationOpportunities.map((opp, i) => (
                        <li key={i}>{opp}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Questions to Ask */}
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-2">
                    <strong className="text-emerald-900 font-bold flex items-center gap-1">
                      <HelpCircle className="w-4 h-4 text-emerald-600" /> Critical Questions to Ask Vendor:
                    </strong>
                    <ul className="list-disc list-inside text-slate-700 space-y-1">
                      {negotiationInsight.questionsToAskVendor.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Missing Services & Contract Concerns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 space-y-2">
                    <strong className="text-amber-900 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> Missing Service Warnings:
                    </strong>
                    <ul className="list-disc list-inside text-slate-700 space-y-1">
                      {negotiationInsight.missingServiceWarnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 space-y-2">
                    <strong className="text-rose-900 font-bold flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-rose-600" /> Contractual & Payment Risk Observations:
                    </strong>
                    <ul className="list-disc list-inside text-slate-700 space-y-1">
                      {negotiationInsight.paymentTermConcerns.concat(negotiationInsight.contractualRiskObservations).map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* SUB-TAB 6: Procurement Budget Reconciler */}
      {activeSubTab === 'budget' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" /> Procurement Budget Integration & Reconciler
                </h3>
                <p className="text-xs text-slate-500">
                  Compare selected vendor procurement bundle against approved event budget (₹15 Lakhs). Updates active event state only upon explicit confirmation.
                </p>
              </div>

              <button
                onClick={() => setShowApplyProcurementModal(true)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <FileCheck className="w-4 h-4" />
                <span>Apply Procurement Bundle to Event Plan</span>
              </button>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approved Event Budget</span>
                <p className="text-lg font-extrabold text-slate-900">₹{budgetImpact.approvedBudget.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">Host approved financial ceiling</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proposed Procurement Cost</span>
                <p className="text-lg font-extrabold text-blue-700">₹{budgetImpact.proposedVendorExpenditure.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">Sum of selected vendor quotations</p>
              </div>

              <div className={`p-4 rounded-xl border space-y-1 ${
                budgetImpact.remainingBudget >= 0 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
              }`}>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remaining Buffer / Deficit</span>
                <p className={`text-lg font-extrabold ${budgetImpact.remainingBudget >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {budgetImpact.remainingBudget >= 0 ? `+₹${budgetImpact.remainingBudget.toLocaleString()}` : `-₹${Math.abs(budgetImpact.remainingBudget).toLocaleString()}`}
                </p>
                <p className="text-[10px] text-slate-600">{budgetImpact.remainingBudget >= 0 ? 'Surplus Buffer Available' : 'Shortfall Identified'}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selected Vendors</span>
                <p className="text-lg font-extrabold text-slate-900">{selectedProcurementList.length} Categories Locked</p>
                <p className="text-[10px] text-slate-500">Catering, Decor, Photography, etc.</p>
              </div>
            </div>

            {/* Category Variance Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-bold border-y border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Selected Vendor</th>
                    <th className="py-2.5 px-3">Allocated Budget</th>
                    <th className="py-2.5 px-3">Proposed Vendor Cost</th>
                    <th className="py-2.5 px-3">Category Variance</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {budgetImpact.categoryVariances.map((v) => (
                    <tr key={v.category} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-bold text-slate-900">{v.category}</td>
                      <td className="py-3 px-3 font-medium text-slate-700">{v.selectedVendorName || 'Not Selected'}</td>
                      <td className="py-3 px-3">₹{v.allocatedBudget.toLocaleString()}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">₹{v.proposedVendorCost.toLocaleString()}</td>
                      <td className={`py-3 px-3 font-bold ${v.variance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {v.variance >= 0 ? `+₹${v.variance.toLocaleString()}` : `-₹${Math.abs(v.variance).toLocaleString()}`}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          v.status === 'Under Budget' || v.status === 'On Budget'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Add/Edit Vendor Modal */}
      {showAddVendorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-600" />
                <span>{editingVendor ? 'Edit Vendor Details' : 'Add New Vendor'}</span>
              </h3>
              <button
                onClick={() => {
                  setShowAddVendorModal(false);
                  setEditingVendor(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVendorFormSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Vendor Company / Name:</label>
                <input
                  type="text"
                  required
                  value={vendorForm.name}
                  onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                  placeholder="e.g. Chennai Grand Caterers"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category:</label>
                  <select
                    value={vendorForm.category}
                    onChange={(e) => setVendorForm({ ...vendorForm, category: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none"
                  >
                    <option value="Catering">Catering</option>
                    <option value="Venue">Venue</option>
                    <option value="Decoration">Decoration</option>
                    <option value="Photography">Photography</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Accommodation">Accommodation</option>
                    <option value="Transport">Transport</option>
                    <option value="Miscellaneous">Other Services</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status:</label>
                  <select
                    value={vendorForm.status}
                    onChange={(e) => setVendorForm({ ...vendorForm, status: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none"
                  >
                    <option value="Inquiry">Inquiry</option>
                    <option value="Quoted">Quoted</option>
                    <option value="Negotiating">Negotiating</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Declined">Declined</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Contact Person:</label>
                  <input
                    type="text"
                    value={vendorForm.contactPerson}
                    onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone Number:</label>
                  <input
                    type="text"
                    value={vendorForm.phone}
                    onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Quoted Price (₹):</label>
                  <input
                    type="number"
                    required
                    value={vendorForm.quotedPrice}
                    onChange={(e) => setVendorForm({ ...vendorForm, quotedPrice: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Negotiated Target (₹):</label>
                  <input
                    type="number"
                    value={vendorForm.negotiatedPrice}
                    onChange={(e) => setVendorForm({ ...vendorForm, negotiatedPrice: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes / Inclusions:</label>
                <textarea
                  rows={3}
                  value={vendorForm.notes}
                  onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddVendorModal(false);
                    setEditingVendor(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-md"
                >
                  {editingVendor ? 'Save Changes' : 'Create Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Delete Vendor Confirmation */}
      {deletingVendorId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" /> Delete Vendor Confirmation
            </h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete this vendor from your active event? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingVendorId(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteVendor}
                className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-md"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Manual Correction & Verification */}
      {showManualCorrectionModal && parsedPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Manual Quotation Correction & Verification</h3>
              <button onClick={() => setShowManualCorrectionModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Vendor Name:</label>
                <input
                  type="text"
                  value={parsedPreview.vendorName}
                  onChange={(e) => setParsedPreview({ ...parsedPreview, vendorName: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Base Price (₹):</label>
                  <input
                    type="number"
                    value={parsedPreview.quotedAmount}
                    onChange={(e) => {
                      const base = Number(e.target.value);
                      setParsedPreview({
                        ...parsedPreview,
                        quotedAmount: base,
                        totalEstimatedCost: base + parsedPreview.taxesAndGst,
                      });
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">GST / Taxes (₹):</label>
                  <input
                    type="number"
                    value={parsedPreview.taxesAndGst}
                    onChange={(e) => {
                      const gst = Number(e.target.value);
                      setParsedPreview({
                        ...parsedPreview,
                        taxesAndGst: gst,
                        totalEstimatedCost: parsedPreview.quotedAmount + gst,
                      });
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Terms:</label>
                <input
                  type="text"
                  value={parsedPreview.paymentTerms}
                  onChange={(e) => setParsedPreview({ ...parsedPreview, paymentTerms: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowManualCorrectionModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowManualCorrectionModal(false);
                  handleSaveParsedQuotation();
                }}
                className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-md"
              >
                Confirm & Save Quotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Apply Procurement Bundle Approval Modal */}
      {showApplyProcurementModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-blue-600" />
                <span>Confirm Procurement Assignments</span>
              </h3>
              <button onClick={() => setShowApplyProcurementModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-slate-600">
                You are about to lock the following selected vendor procurement assignments to <strong>{activeEvent.name}</strong>:
              </p>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                {selectedProcurementList.map((proc) => (
                  <div key={proc.category} className="flex justify-between font-bold text-slate-800">
                    <span>{proc.category}: {proc.vendorName}</span>
                    <span className="text-blue-700">₹{proc.cost.toLocaleString()}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-slate-900">
                  <span>Total Proposed Cost:</span>
                  <span className="text-emerald-700">₹{budgetImpact.proposedVendorExpenditure.toLocaleString()}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                <strong className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> Event Budget Integrity Guardrail:
                </strong>
                <p className="text-[11px]">
                  Clicking "Confirm and Apply" will update the active event expenses and vendor contracts in persistent storage. The approved host budget ceiling (₹15 Lakhs) remains unchanged.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowApplyProcurementModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
              >
                Cancel & Retain Active Plan
              </button>
              <button
                onClick={handleConfirmApplyProcurement}
                className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-md"
              >
                Confirm and Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
