import React, { useState } from 'react';
import {
  Briefcase,
  Star,
  Plus,
  Trash2,
  CheckCircle,
  Phone,
  Mail,
  Sliders,
  DollarSign,
  Scale,
  Award,
  Filter,
  Check,
  AlertCircle,
} from 'lucide-react';
import { EventPlan, Vendor, VendorCategory, VendorStatus, PaymentStatus } from '../../types';
import { calculateVendorScore, evaluateBudgetCompatibility, compareVendors } from '../../domain/vendorEngine';
import { useAccessibleModal } from '../../hooks/useAccessibleModal';

interface VendorViewProps {
  activeEvent: EventPlan;
  onUpdateEvent: (updated: EventPlan) => void;
}

export const VendorView: React.FC<VendorViewProps> = ({
  activeEvent,
  onUpdateEvent,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedVendorsForComparison, setSelectedVendorsForComparison] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const compareModalRef = useAccessibleModal({
    isOpen: isCompareModalOpen,
    onClose: () => setIsCompareModalOpen(false),
  });

  // New Vendor Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const addVendorModalRef = useAccessibleModal({
    isOpen: isModalOpen,
    onClose: () => setIsModalOpen(false),
  });
  const [name, setName] = useState('');
  const [category, setCategory] = useState<VendorCategory>('Catering');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [quotedPrice, setQuotedPrice] = useState<number>(100000);
  const [negotiatedPrice, setNegotiatedPrice] = useState<number>(90000);
  const [status, setStatus] = useState<VendorStatus>('Quoted');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Unpaid');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isPreferred, setIsPreferred] = useState(false);
  const [notes, setNotes] = useState('');
  // Raw scores (0-100)
  const [budgetScore, setBudgetScore] = useState<number>(85);
  const [serviceScore, setServiceScore] = useState<number>(90);
  const [availScore, setAvailScore] = useState<number>(85);
  const [starRating, setStarRating] = useState<number>(4.5);

  const formatCurrency = (amt: number) => {
    const sym =
      activeEvent.currency === 'INR'
        ? '₹'
        : activeEvent.currency === 'USD'
        ? '$'
        : activeEvent.currency === 'EUR'
        ? '€'
        : '£';
    return `${sym}${amt.toLocaleString()}`;
  };

  const handleTogglePreferred = (vendorId: string) => {
    const updated = activeEvent.vendors.map((v) =>
      v.id === vendorId ? { ...v, isPreferred: !v.isPreferred } : v
    );
    onUpdateEvent({ ...activeEvent, vendors: updated, updatedAt: new Date().toISOString() });
  };

  const handleUpdateStatus = (vendorId: string, newStatus: VendorStatus) => {
    const updated = activeEvent.vendors.map((v) =>
      v.id === vendorId ? { ...v, status: newStatus } : v
    );
    onUpdateEvent({ ...activeEvent, vendors: updated, updatedAt: new Date().toISOString() });
  };

  const handleDeleteVendor = (vendorId: string) => {
    const updated = activeEvent.vendors.filter((v) => v.id !== vendorId);
    onUpdateEvent({ ...activeEvent, vendors: updated, updatedAt: new Date().toISOString() });
    setSelectedVendorsForComparison((prev) => prev.filter((id) => id !== vendorId));
  };

  const handleAddVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const { compositeScore, ratingScore } = calculateVendorScore({
      budgetCompatibilityScore: budgetScore,
      serviceSuitabilityScore: serviceScore,
      availabilityScore: availScore,
      rating: starRating,
    });

    const newVendor: Vendor = {
      id: `vnd-${Date.now()}`,
      name: name.includes('[DEMO DATA]') ? name.trim() : `${name.trim()} [DEMO DATA]`,
      category,
      contactPerson: contactPerson.trim() || 'Coordinator',
      phone: phone.trim() || '+91 98000 00000',
      email: email.trim() || 'demo@vendor.demo',
      quotedPrice,
      negotiatedPrice: negotiatedPrice || quotedPrice,
      status,
      paymentStatus,
      paidAmount,
      isPreferred,
      notes: notes.trim(),
      budgetCompatibilityScore: budgetScore,
      serviceSuitabilityScore: serviceScore,
      availabilityScore: availScore,
      rating: starRating,
      ratingScore,
      compositeScore,
      isDemoData: true,
    };

    onUpdateEvent({
      ...activeEvent,
      vendors: [newVendor, ...activeEvent.vendors],
      updatedAt: new Date().toISOString(),
    });

    setIsModalOpen(false);
    setName('');
  };

  const toggleSelectForComparison = (id: string) => {
    if (selectedVendorsForComparison.includes(id)) {
      setSelectedVendorsForComparison((prev) => prev.filter((vId) => vId !== id));
    } else {
      if (selectedVendorsForComparison.length >= 3) {
        alert('You can compare a maximum of 3 vendors at a time.');
        return;
      }
      setSelectedVendorsForComparison((prev) => [...prev, id]);
    }
  };

  const comparisonVendors = activeEvent.vendors.filter((v) =>
    selectedVendorsForComparison.includes(v.id)
  );
  const comparisonResult = compareVendors(comparisonVendors);

  const filteredVendors = activeEvent.vendors.filter((v) => {
    if (selectedCategory !== 'All' && v.category !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendor Intelligence & Scoring</h1>
          <p className="text-xs text-slate-500 mt-1">
            Suitability Scoring: 35% Budget • 30% Service • 20% Availability • 15% Rating [All Demo Data Labeled]
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedVendorsForComparison.length >= 2 && (
            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Scale className="w-4 h-4" />
              <span>Compare Selected ({selectedVendorsForComparison.length})</span>
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Candidate Vendor</span>
          </button>
        </div>
      </div>

      {/* Synthetic Data Disclaimer Banner */}
      <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-300 text-slate-800 uppercase tracking-wide">
            Notice
          </span>
          <span>
            Demonstration Environment: All vendor listings, quotes, and ratings are synthetic simulation data.
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-400 font-semibold">
          {activeEvent.vendors.length} candidate profiles loaded
        </span>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {['All', 'Venue', 'Catering', 'Photography', 'Decoration', 'Entertainment', 'Transport', 'Accommodation'].map(
          (cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          )
        )}
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVendors.map((vendor) => {
          const isSelected = selectedVendorsForComparison.includes(vendor.id);

          return (
            <div
              key={vendor.id}
              className={`rounded-2xl border bg-white p-5 shadow-sm transition relative flex flex-col justify-between ${
                vendor.isPreferred
                  ? 'border-teal-500 ring-2 ring-teal-500/10'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Card Top: Category & Suitability Score Badge */}
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                    {vendor.category}
                  </span>

                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-teal-500/15 to-blue-500/15 border border-teal-500/30 text-teal-800 text-xs font-extrabold"
                    title={`Composite: ${vendor.compositeScore}/100 (35% Budget, 30% Service, 20% Avail, 15% Rating)`}
                  >
                    <Award className="w-3.5 h-3.5 text-teal-600" />
                    <span>{vendor.compositeScore} / 100</span>
                  </div>
                </div>

                {/* Vendor Name */}
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  {vendor.name}
                </h3>

                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center text-amber-500 text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-500 mr-1" />
                    <span>{(vendor.rating ?? 0).toFixed(1)}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">•</span>
                  <span className="text-xs text-slate-600 truncate">{vendor.contactPerson}</span>
                </div>

                {/* Score Breakdown Bars */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-[11px] mb-4">
                  <div className="flex justify-between text-slate-600">
                    <span>Budget Fit (35%):</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {vendor.budgetCompatibilityScore}%
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Service Quality (30%):</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {vendor.serviceSuitabilityScore}%
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Availability (20%):</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {vendor.availabilityScore}%
                    </span>
                  </div>
                </div>

                {/* Commercials Box */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Quoted Price
                    </span>
                    <span className="font-bold text-slate-900 font-mono">
                      {formatCurrency(vendor.quotedPrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Negotiated
                    </span>
                    <span className="font-bold text-teal-700 font-mono">
                      {formatCurrency(vendor.negotiatedPrice || vendor.quotedPrice)}
                    </span>
                  </div>
                </div>

                {/* Status Dropdowns */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <select
                    value={vendor.status}
                    onChange={(e) => handleUpdateStatus(vendor.id, e.target.value as VendorStatus)}
                    className="text-[11px] px-2 py-1 rounded-md border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="Inquiry">Inquiry</option>
                    <option value="Quoted">Quoted</option>
                    <option value="Negotiating">Negotiating</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Declined">Declined</option>
                  </select>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      vendor.paymentStatus === 'Fully Paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : vendor.paymentStatus === 'Advance Paid'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {vendor.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Bottom Actions: Compare Checkbox, Preferred Toggle, Delete */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectForComparison(vendor.id)}
                    className="rounded text-teal-600 accent-teal-600 w-3.5 h-3.5"
                  />
                  <span>Compare</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePreferred(vendor.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition ${
                      vendor.isPreferred
                        ? 'bg-teal-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {vendor.isPreferred ? '★ Preferred' : 'Set Preferred'}
                  </button>

                  <button
                    onClick={() => handleDeleteVendor(vendor.id)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500"
                    title="Remove vendor"
                    aria-label={`Remove vendor ${vendor.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compare Modal */}
      {isCompareModalOpen && comparisonResult && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="compare-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            ref={compareModalRef}
            tabIndex={-1}
            className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto focus:outline-none"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-teal-600" />
                <h2 id="compare-modal-title" className="text-base font-bold text-slate-900">
                  Side-by-Side Vendor Head-to-Head Comparison
                </h2>
              </div>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer p-1 rounded focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Close comparison dialog"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {comparisonResult.vendors.map((v) => (
                <div
                  key={v.id}
                  className={`p-4 rounded-xl border ${
                    v.id === comparisonResult.highestScoring?.id
                      ? 'border-teal-500 bg-teal-50/30'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {v.id === comparisonResult.highestScoring?.id && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-600 text-white block mb-2 text-center uppercase">
                      Top Suitability Match
                    </span>
                  )}
                  <h4 className="font-bold text-slate-900 text-sm mb-1">{v.name}</h4>
                  <div className="text-xl font-bold text-teal-800 font-mono mb-2">
                    Score: {v.compositeScore} / 100
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                    <p>
                      <strong>Quote:</strong> {formatCurrency(v.quotedPrice)}
                    </p>
                    <p>
                      <strong>Rating:</strong> {v.rating} ★
                    </p>
                    <p>
                      <strong>Status:</strong> {v.status}
                    </p>
                    <p>
                      <strong>Contact:</strong> {v.phone}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-800">Intelligence Verdict:</p>
              <p className="text-slate-600">
                Price variance across candidates is {formatCurrency(comparisonResult.priceDelta)}.
                Highest-scoring candidate provides {comparisonResult.scoreDelta} points higher suitability index.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Vendor Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-vendor-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            ref={addVendorModalRef}
            tabIndex={-1}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto focus:outline-none"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 id="add-vendor-modal-title" className="text-base font-bold text-slate-900">Add Candidate Vendor</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer p-1 rounded focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVendor} className="space-y-3.5">
              <div>
                <label htmlFor="vendor-name" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Vendor / Business Name *
                </label>
                <input
                  id="vendor-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Coastal Heritage Banquets"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="vendor-category" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Category *
                  </label>
                  <select
                    id="vendor-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as VendorCategory)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Venue">Venue</option>
                    <option value="Catering">Catering</option>
                    <option value="Decoration">Decoration</option>
                    <option value="Photography">Photography</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Transport">Transport</option>
                    <option value="Accommodation">Accommodation</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="vendor-contact" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Contact Person
                  </label>
                  <input
                    id="vendor-contact"
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g., Rajesh Kumar"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="vendor-quoted-price" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Quoted Price *
                  </label>
                  <input
                    id="vendor-quoted-price"
                    type="number"
                    min="0"
                    value={quotedPrice}
                    onChange={(e) => setQuotedPrice(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="vendor-negotiated-price" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Negotiated Target
                  </label>
                  <input
                    id="vendor-negotiated-price"
                    type="number"
                    min="0"
                    value={negotiatedPrice}
                    onChange={(e) => setNegotiatedPrice(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Scoring parameters */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Scoring Criteria Inputs (35/30/20/15)
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-slate-600 block text-[11px]">Budget Fit: {budgetScore}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={budgetScore}
                      onChange={(e) => setBudgetScore(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block text-[11px]">Service Quality: {serviceScore}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={serviceScore}
                      onChange={(e) => setServiceScore(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block text-[11px]">Availability: {availScore}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={availScore}
                      onChange={(e) => setAvailScore(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block text-[11px]">Rating: {starRating} Stars</label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.1"
                      value={starRating}
                      onChange={(e) => setStarRating(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition cursor-pointer"
                >
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
