/**
 * Synthetic Demonstration Data
 * Clearly labeled as synthetic demo data for competition evaluation.
 */

import { EventPlan } from '../types';
import { generateDefaultMilestones, generateDefaultTasks } from '../domain/timelineEngine';
import { calculateVendorScore } from '../domain/vendorEngine';

// Calculate synthetic vendor scores using 35% budget, 30% service, 20% availability, 15% rating formula
function createDemoVendor(params: {
  id: string;
  name: string;
  category: any;
  contactPerson: string;
  phone: string;
  email: string;
  quotedPrice: number;
  negotiatedPrice: number;
  status: any;
  paymentStatus: any;
  paidAmount: number;
  isPreferred: boolean;
  notes: string;
  budgetCompatibilityScore: number;
  serviceSuitabilityScore: number;
  availabilityScore: number;
  rating: number;
}) {
  const { compositeScore, ratingScore } = calculateVendorScore({
    budgetCompatibilityScore: params.budgetCompatibilityScore,
    serviceSuitabilityScore: params.serviceSuitabilityScore,
    availabilityScore: params.availabilityScore,
    rating: params.rating,
  });

  return {
    ...params,
    ratingScore,
    compositeScore,
    isDemoData: true,
  };
}

const chennaiMilestones = generateDefaultMilestones('2027-02-15', 'Wedding');
const chennaiTasks = generateDefaultTasks('2027-02-15', chennaiMilestones);

// Mark some initial tasks completed for realistic demo
chennaiTasks[0].status = 'Completed';
chennaiTasks[1].status = 'Completed';
chennaiTasks[2].status = 'In Progress';

export const SEED_EVENTS: EventPlan[] = [
  {
    id: 'cai-event-chennai-wedding',
    name: "Ananya & Rohan's Royal Traditional Wedding",
    type: 'Wedding',
    location: 'Chennai, Tamil Nadu, India',
    eventDate: '2027-02-15',
    guestCount: 300,
    totalBudget: 1500000, // 15 Lakhs INR
    currency: 'INR',
    userPreferences: 'Traditional South Indian aesthetics, authentic Chettinad & vegetarian feast, temple-motif floral mandap, classical nadaswaram with fusion evening orchestra.',
    specialRequirements: 'Eco-friendly banana leaf dining service, dedicated elder assistance buggy, drone videography permit for beachside temple lawns.',
    priorityConsiderations: 'Food quality & authentic taste (Absolute #1), Photography & cinematography, Traditional floral craftsmanship.',
    createdAt: '2026-10-15T10:00:00Z',
    updatedAt: '2026-11-01T08:30:00Z',
    budgetAllocations: [
      { category: 'Venue', percentage: 20, allocatedAmount: 300000 },
      { category: 'Catering', percentage: 30, allocatedAmount: 450000 },
      { category: 'Decoration', percentage: 15, allocatedAmount: 225000 },
      { category: 'Photography', percentage: 10, allocatedAmount: 150000 },
      { category: 'Entertainment', percentage: 8, allocatedAmount: 120000 },
      { category: 'Accommodation', percentage: 4, allocatedAmount: 60000 },
      { category: 'Transport', percentage: 3, allocatedAmount: 45000 },
      { category: 'Miscellaneous', percentage: 10, allocatedAmount: 150000 }, // Includes 7% contingency
    ],
    expenses: [
      {
        id: 'exp-1',
        category: 'Venue',
        name: 'Mahabalipuram Heritage Lawns & Banquet Hall',
        estimatedCost: 300000,
        actualCost: 285000,
        paidAmount: 100000,
        paymentStatus: 'Advance Paid',
        vendorId: 'vnd-1',
        notes: 'Secured with 1L initial advance, includes lawn + indoor banquet',
      },
      {
        id: 'exp-2',
        category: 'Catering',
        name: 'Grand Royal Traditional South Indian & Fusion Feast (300 Pax)',
        estimatedCost: 450000,
        actualCost: 465000,
        paidAmount: 150000,
        paymentStatus: 'Advance Paid',
        vendorId: 'vnd-2',
        notes: 'Includes breakfast, full banana leaf lunch, filter coffee stalls',
      },
      {
        id: 'exp-3',
        category: 'Decoration',
        name: 'Traditional Temple Motif Mandap & Fresh Jasmine Stage',
        estimatedCost: 225000,
        actualCost: 210000,
        paidAmount: 50000,
        paymentStatus: 'Advance Paid',
        vendorId: 'vnd-3',
      },
      {
        id: 'exp-4',
        category: 'Photography',
        name: 'Candid Cinematic Wedding Photography + 4K Drone Reel',
        estimatedCost: 150000,
        actualCost: 145000,
        paidAmount: 45000,
        paymentStatus: 'Advance Paid',
        vendorId: 'vnd-4',
      },
      {
        id: 'exp-5',
        category: 'Entertainment',
        name: 'Live Nadaswaram Troupe + Evening Carnatic Fusion Ensemble',
        estimatedCost: 120000,
        actualCost: 110000,
        paidAmount: 30000,
        paymentStatus: 'Advance Paid',
        vendorId: 'vnd-5',
      },
      {
        id: 'exp-6',
        category: 'Accommodation',
        name: 'Guest Room Block (12 Rooms for Outstation Family)',
        estimatedCost: 60000,
        actualCost: 65000,
        paidAmount: 20000,
        paymentStatus: 'Advance Paid',
        vendorId: 'vnd-6',
      },
      {
        id: 'exp-7',
        category: 'Transport',
        name: 'Airport Shuttles & Bridal Vintage Vehicle',
        estimatedCost: 45000,
        actualCost: 42000,
        paidAmount: 15000,
        paymentStatus: 'Advance Paid',
      },
    ],
    milestones: chennaiMilestones,
    tasks: chennaiTasks,
    vendors: [
      createDemoVendor({
        id: 'vnd-1',
        name: 'Mahabalipuram Coastal Heritage Lawns [DEMO DATA]',
        category: 'Venue',
        contactPerson: 'Suresh Raman',
        phone: '+91 98401 22345',
        email: 'suresh@coastalheritage.demo',
        quotedPrice: 310000,
        negotiatedPrice: 285000,
        status: 'Confirmed',
        paymentStatus: 'Advance Paid',
        paidAmount: 100000,
        isPreferred: true,
        notes: 'Prime beachview lawn capacity 450 pax. Deposit paid.',
        budgetCompatibilityScore: 92,
        serviceSuitabilityScore: 96,
        availabilityScore: 95,
        rating: 4.8,
      }),
      createDemoVendor({
        id: 'vnd-2',
        name: 'Sri Krishna Grand Traditional Caterers [DEMO DATA]',
        category: 'Catering',
        contactPerson: 'Venkatesh Iyer',
        phone: '+91 98412 88761',
        email: 'venkatesh@krishnacatering.demo',
        quotedPrice: 480000,
        negotiatedPrice: 465000,
        status: 'Confirmed',
        paymentStatus: 'Advance Paid',
        paidAmount: 150000,
        isPreferred: true,
        notes: 'Famous for traditional Kalyana Samayal + contemporary live counters.',
        budgetCompatibilityScore: 85,
        serviceSuitabilityScore: 98,
        availabilityScore: 90,
        rating: 4.9,
      }),
      createDemoVendor({
        id: 'vnd-3',
        name: 'Chola Mandapam & Floral Artisans [DEMO DATA]',
        category: 'Decoration',
        contactPerson: 'Kavitha Murugan',
        phone: '+91 97909 33210',
        email: 'kavitha@cholamandapam.demo',
        quotedPrice: 240000,
        negotiatedPrice: 210000,
        status: 'Confirmed',
        paymentStatus: 'Advance Paid',
        paidAmount: 50000,
        isPreferred: true,
        notes: 'Handcrafted bell-metal props and fresh Madurai jasmine.',
        budgetCompatibilityScore: 88,
        serviceSuitabilityScore: 92,
        availabilityScore: 85,
        rating: 4.7,
      }),
      createDemoVendor({
        id: 'vnd-4',
        name: 'Lumiere South Cine Weddings [DEMO DATA]',
        category: 'Photography',
        contactPerson: 'Deepak Raj',
        phone: '+91 98840 99432',
        email: 'deepak@lumierecine.demo',
        quotedPrice: 160000,
        negotiatedPrice: 145000,
        status: 'Confirmed',
        paymentStatus: 'Advance Paid',
        paidAmount: 45000,
        isPreferred: true,
        notes: 'Deliverables: 3 teasers, full 4K documentary film, raw photobook.',
        budgetCompatibilityScore: 90,
        serviceSuitabilityScore: 94,
        availabilityScore: 90,
        rating: 4.8,
      }),
      createDemoVendor({
        id: 'vnd-5',
        name: 'Ragha Tarangini Musical Ensemble [DEMO DATA]',
        category: 'Entertainment',
        contactPerson: 'Anand Shastri',
        phone: '+91 94441 55678',
        email: 'anand@raghatarangini.demo',
        quotedPrice: 130000,
        negotiatedPrice: 110000,
        status: 'Confirmed',
        paymentStatus: 'Advance Paid',
        paidAmount: 30000,
        isPreferred: true,
        notes: 'Morning traditional mangala vadhyam & evening unplugged carnatic fusion.',
        budgetCompatibilityScore: 94,
        serviceSuitabilityScore: 90,
        availabilityScore: 95,
        rating: 4.6,
      }),
      createDemoVendor({
        id: 'vnd-alt-venue',
        name: 'Temple Bay Palm Grove Resort [DEMO DATA]',
        category: 'Venue',
        contactPerson: 'Manish Verma',
        phone: '+91 98402 77811',
        email: 'manish@templebay.demo',
        quotedPrice: 380000,
        negotiatedPrice: 350000,
        status: 'Quoted',
        paymentStatus: 'Unpaid',
        paidAmount: 0,
        isPreferred: false,
        notes: 'Higher rate alternative candidate with beachfront pool lawn.',
        budgetCompatibilityScore: 68,
        serviceSuitabilityScore: 90,
        availabilityScore: 80,
        rating: 4.5,
      }),
    ],
    risks: [
      {
        id: 'rsk-seed-1',
        category: 'Budget',
        severity: 'Medium',
        title: 'Catering Line Exceeds Allocation by ₹15,000',
        explanation: 'Agreed catering menu (₹4,65,000) is slightly above the ₹4,50,000 initial allocation due to the addition of evening filter coffee & live chaat counters.',
        recommendedAction: 'Reallocate ₹15,000 surplus saved from Venue negotiation (saved ₹15,000) to keep bottom line zero-sum.',
        status: 'Mitigating',
        detectedAt: '2026-10-25',
        source: 'Rule Engine',
      },
      {
        id: 'rsk-seed-2',
        category: 'Logistics',
        severity: 'Low',
        title: 'Airport Transit Window Coordination',
        explanation: '30 VIP relatives landing within a 2-hour window on February 14th requiring synchronized shuttle timing.',
        recommendedAction: 'Collect flight arrival PNRs 14 days prior and assign dedicated driver fleet.',
        status: 'Open',
        detectedAt: '2026-10-28',
        source: 'Rule Engine',
      },
    ],
  },
  {
    id: 'cai-event-bengaluru-birthday',
    name: "Arjun's 30th Milestone Birthday Gala",
    type: 'Birthday',
    location: 'Bengaluru, Karnataka, India',
    eventDate: '2026-12-18',
    guestCount: 120,
    totalBudget: 350000,
    currency: 'INR',
    userPreferences: 'Rooftop lounge ambiance, indie acoustic band, gourmet artisanal food stations, neon photography booth.',
    specialRequirements: 'Custom cocktail mixology bar, surprise midnight fireworks/sparkler display.',
    priorityConsiderations: 'Music ambiance & DJ, Craft beverages, Aesthetic lighting.',
    createdAt: '2026-10-20T14:00:00Z',
    updatedAt: '2026-11-01T06:00:00Z',
    budgetAllocations: [
      { category: 'Venue', percentage: 25, allocatedAmount: 87500 },
      { category: 'Catering', percentage: 35, allocatedAmount: 122500 },
      { category: 'Decoration', percentage: 15, allocatedAmount: 52500 },
      { category: 'Entertainment', percentage: 15, allocatedAmount: 52500 },
      { category: 'Photography', percentage: 5, allocatedAmount: 17500 },
      { category: 'Miscellaneous', percentage: 5, allocatedAmount: 17500 },
    ],
    expenses: [
      {
        id: 'b-exp-1',
        category: 'Venue',
        name: 'Skyline Terrace Lounge Indiranagar',
        estimatedCost: 85000,
        actualCost: 85000,
        paidAmount: 40000,
        paymentStatus: 'Advance Paid',
      },
      {
        id: 'b-exp-2',
        category: 'Catering',
        name: 'Gourmet Tapas & Craft Cocktails Bar',
        estimatedCost: 120000,
        actualCost: 125000,
        paidAmount: 50000,
        paymentStatus: 'Advance Paid',
      },
    ],
    milestones: generateDefaultMilestones('2026-12-18', 'Birthday').slice(0, 6),
    tasks: generateDefaultTasks('2026-12-18', generateDefaultMilestones('2026-12-18', 'Birthday').slice(0, 6)),
    vendors: [
      createDemoVendor({
        id: 'b-vnd-1',
        name: 'Skyline Horizon Lounge [DEMO DATA]',
        category: 'Venue',
        contactPerson: 'Sameer Sen',
        phone: '+91 99001 11223',
        email: 'sameer@skylineterrace.demo',
        quotedPrice: 90000,
        negotiatedPrice: 85000,
        status: 'Confirmed',
        paymentStatus: 'Advance Paid',
        paidAmount: 40000,
        isPreferred: true,
        notes: 'Rooftop view with sound system permitted until 11 PM.',
        budgetCompatibilityScore: 95,
        serviceSuitabilityScore: 92,
        availabilityScore: 90,
        rating: 4.7,
      }),
    ],
    risks: [],
  },
  {
    id: 'cai-event-technova-summit',
    name: 'TechNova Annual Leadership Summit & Gala',
    type: 'Corporate event',
    location: 'Hyderabad, Telangana, India',
    eventDate: '2027-04-10',
    guestCount: 250,
    totalBudget: 800000,
    currency: 'INR',
    userPreferences: 'High-tech keynote staging, seamless Wi-Fi and audio-visual streaming, executive multi-cuisine dining, networking breakout lounges.',
    specialRequirements: 'Simultaneous translation booths, executive security clearance, live broadcast feed.',
    priorityConsiderations: 'Audio-visual clarity, Strict adherence to run-of-show timeline, Premium executive catering.',
    createdAt: '2026-10-22T09:00:00Z',
    updatedAt: '2026-10-30T11:00:00Z',
    budgetAllocations: [
      { category: 'Venue', percentage: 30, allocatedAmount: 240000 },
      { category: 'Catering', percentage: 30, allocatedAmount: 240000 },
      { category: 'Entertainment', percentage: 20, allocatedAmount: 160000 }, // Audio-Visual & Stage
      { category: 'Decoration', percentage: 10, allocatedAmount: 80000 },
      { category: 'Photography', percentage: 5, allocatedAmount: 40000 },
      { category: 'Miscellaneous', percentage: 5, allocatedAmount: 40000 },
    ],
    expenses: [],
    milestones: generateDefaultMilestones('2027-04-10', 'Corporate event'),
    tasks: generateDefaultTasks('2027-04-10', generateDefaultMilestones('2027-04-10', 'Corporate event')),
    vendors: [],
    risks: [],
  },
];
