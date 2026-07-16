import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import './App.css';

type BayState =
  | 'closed'
  | 'unlocking'
  | 'opening'
  | 'open'
  | 'closing'
  | 'locking';

type ScreenId =
  | 'home'
  | 'menu'
  | 'species'
  | 'objects'
  | 'events'
  | 'anomalies'
  | 'corvids'
  | 'bullfrogs'
  | 'wombats'
  | 'nutrias'
  | 'platypus'
  | 'dossier';

type BootPhase = 'flicker' | 'display' | 'loading' | 'granted' | 'ready';
type DeliveryPhase = 'retrieving' | 'retrieved';

type Dossier = {
  id: string;
  name: string;
  status: string;
  classification: string;
  date: string;
  summary: string;
};

const WOMBAT_DOSSIER_OVERRIDES: Record<string, Partial<Dossier>> = {
  'WMBT-017': {
    name: 'BARON VON STANK',
    status: 'CONTAINED',
    classification: 'TIER III',
    date: '1987-04-12',
    summary:
      'Subject manifests only during periods of formal civic ceremony. Physical contact with subject results in compulsive politeness lasting 72 hours.',
  },
  'WMBT-018': {
    name: 'THE SEPTIC PHILOSOPHER',
    status: 'CONTAINED',
    classification: 'TIER II',
    date: '2024-04-22',
    summary:
      'Subject dispenses unsolicited life advice while wearing makeshift headgear. Personnel are advised not to engage in debates.',
  },
  'WMBT-022': {
    name: 'THE HOLLOW CHOIR',
    status: 'MONITORED',
    classification: 'TIER II',
    date: '1991-08-30',
    summary:
      'Auditory anomaly recurring in subterranean transit structures. Exposure induces involuntary vocalization in bystanders within a 40-meter radius.',
  },
};

const GENERATED_WOMBAT_DOSSIERS: Dossier[] = Array.from(
  { length: 13 },
  (_, index) => {
    const dossierNumber = String(index + 10).padStart(3, '0');
    const id = `WMBT-${dossierNumber}`;

    return {
      id,
      name: `WOMBAT SPECIMEN ${dossierNumber}`,
      status: 'INDEXED',
      classification: 'TIER I',
      date: `1988-01-${String(index + 1).padStart(2, '0')}`,
      summary:
        'Species archive shell generated for restricted retrieval testing. Full biological record requires bay authorization.',
      ...WOMBAT_DOSSIER_OVERRIDES[id],
    };
  },
);

const DOSSIERS: Dossier[] = [
  {
    id: 'WMBT-001',
    name: 'THE UNIT',
    status: 'CONTAINED',
    classification: 'UNCLASSIFIED FILTH',
    date: '2026-06-29',
    summary:
      'Flexing in Area 7. Staff are advised that muscle mass overrides authority.',
  },
  {
    id: 'WMBT-007',
    name: 'THE CHIEF EXECUTIVE WOMBAT',
    status: 'CONTAINED',
    classification: 'EXECUTIVE CLASS',
    date: '2026-07-14',
    summary:
      'Specimen exhibits domineering posture, territorial office behavior, and persistent administrative overreach.',
  },
  ...GENERATED_WOMBAT_DOSSIERS,
];

type CategoryEntry = {
  id: string;
  name: string;
  count: number;
  icon?: string;
  dossierId?: string;
  locked?: boolean;
  target?: ScreenId;
};

type BootTask = {
  label: string;
  start: number;
  end: number;
};

/*
 * Each task fills its bar between `start` and `end` on the overall
 * 0..1 boot-loading progress. The ranges overlap so more than one bar
 * is visibly filling at a time, matching the reference boot screen.
 */
const BOOT_TASKS: BootTask[] = [
  { label: 'ARCHIVE HANDSHAKE', start: 0, end: 0.42 },
  { label: 'LOADING INTERFACE MODULES', start: 0.28, end: 0.74 },
  { label: 'VERIFYING CREDENTIALS', start: 0.6, end: 1 },
];

const ASSET_ROOT = '/assets/dars';

const ASSETS = {
  shell: `${ASSET_ROOT}/dars_shell.png`,
  shellOuterMask: `${ASSET_ROOT}/dars_shell_outer_mask.png`,
  crtGlass: `${ASSET_ROOT}/crt_glass_overlay.png`,
  bayCavity: `${ASSET_ROOT}/bay_cavity.png`,
  bayRailLeft: `${ASSET_ROOT}/bay_rail_left.png`,
  bayRailRight: `${ASSET_ROOT}/bay_rail_right.png`,
  bayShadow: `${ASSET_ROOT}/bay_shadow.png`,
  bayFrame: `${ASSET_ROOT}/bay_frame.png`,
  doorUpper: `${ASSET_ROOT}/door_upper.png`,
  doorLower: `${ASSET_ROOT}/door_lower.png`,
  bayLatch: `${ASSET_ROOT}/bay_latch.png`,
  buttonMenu: `${ASSET_ROOT}/button_menu.png`,
  buttonArchive: `${ASSET_ROOT}/button_archive.png`,
  buttonBack: `${ASSET_ROOT}/button_back.png`,
  containmentFolder: `${ASSET_ROOT}/containment_record_folder.png`,

  recordIcon: `${ASSET_ROOT}/record_icon.png`,
  wombatDispensedIcon: `${ASSET_ROOT}/wombat_dispensed_icon.png`,
  bullfrogDispensedIcon: `${ASSET_ROOT}/dispense_bullfrog_icon.png`,
  corvidDispensedIcon: `${ASSET_ROOT}/dispense_corvid_icon.png`,
  nutriaDispensedIcon: `${ASSET_ROOT}/dispense_nutria_icon.png`,
  platypusDispensedIcon: `${ASSET_ROOT}/dispense_platypus_icon.png`,
  speciesIcon: `${ASSET_ROOT}/species_icon.png`,
  speciesWombatIcon: `${ASSET_ROOT}/species_wombat_icon.png`,
  speciesCorvidIcon: `${ASSET_ROOT}/species_corvid_icon.png`,
  speciesBullfrogIcon: `${ASSET_ROOT}/species_bullfrog_icon.png`,
  speciesNutriaIcon: `${ASSET_ROOT}/species_nutria_icon.png`,
  speciesPlatypusIcon: `${ASSET_ROOT}/species_platypus_icon.png`,
  objectIcon: `${ASSET_ROOT}/object_icon.png`,
  eventIcon: `${ASSET_ROOT}/event_icon.png`,
  artifactVhsTape: `${ASSET_ROOT}/artifact_vhs_tape.png`,
  artifactImpossibleKey: `${ASSET_ROOT}/artifact_impossible_key.png`,
  artifactHatSuperiority: `${ASSET_ROOT}/artifact_hat_superiority.png`,
  artifactDairyAnomaly: `${ASSET_ROOT}/artifact_dairy_anomaly.png`,
  artifactBucketThatKnows: `${ASSET_ROOT}/artifact_bucket_that_knows.png`,
  artifactUnflushableBowl: `${ASSET_ROOT}/artifact_unflushable_bowl.png`,
  artifactColdStorageUnit: `${ASSET_ROOT}/artifact_cold_storage_unit.png`,
  artifactIsolationMembrane: `${ASSET_ROOT}/artifact_isolation_membrane.png`,
  artifactAbsorbentTextile: `${ASSET_ROOT}/artifact_absorbent_textile.png`,
  artifactUnauthorizedAubergine: `${ASSET_ROOT}/artifact_unauthorized_aubergine.png`,
  artifactDisplacedImpactHammer: `${ASSET_ROOT}/artifact_displaced_impact_hammer.png`,
  artifactPatterningNailClippers: `${ASSET_ROOT}/artifact_patterning_nail_clippers.png`,
  artifactIncommensurateMeasuringStick: `${ASSET_ROOT}/artifact_incommensurate_measuring_stick.png`,
  artifactPreemptiveTissueDispenser: `${ASSET_ROOT}/artifact_preemptive_tissue_dispenser.png`,
  artifactCharles: `${ASSET_ROOT}/artifact_charles.png`,
  dossierBaronVonStank: `${ASSET_ROOT}/dossier_baron_von_stank.png`,
  dossierSepticPhilosopher: `${ASSET_ROOT}/dossier_septic_philosopher.png`,
  dossierTheUnit: `${ASSET_ROOT}/dossier_the_unit.png`,
  dossierCharlesArtifact: `${ASSET_ROOT}/dossier_charles_artifact.png`,
  dossierChiefExecutiveWombat: `${ASSET_ROOT}/dossier_chief_executive_wombat.png`,

  categoryHexFrame: `${ASSET_ROOT}/category_hex_frame.png`,
  speciesBadge: `${ASSET_ROOT}/category_species_icon.png`,
  artifactBadge: `${ASSET_ROOT}/category_artifact_icon.png`,
  eventBadge: `${ASSET_ROOT}/category_event_icon.png`,
  anomalyBadge: `${ASSET_ROOT}/category_anomalies_icon.png`,
} as const;

const SPECIES_DATABASE: CategoryEntry[] = [
  {
    id: '01',
    name: 'CORVIDS',
    count: 3,
    icon: ASSETS.speciesCorvidIcon,
    target: 'corvids',
  },
  {
    id: '02',
    name: 'BULLFROGS',
    count: 3,
    icon: ASSETS.speciesBullfrogIcon,
    target: 'bullfrogs',
  },
  {
    id: '03',
    name: 'WOMBATS',
    count: DOSSIERS.length,
    icon: ASSETS.speciesWombatIcon,
    target: 'wombats',
  },
  {
    id: '04',
    name: 'NUTRIAS (GROSS)',
    count: 3,
    icon: ASSETS.speciesNutriaIcon,
    target: 'nutrias',
  },
  {
    id: '05',
    name: 'PLATYPUS',
    count: 1,
    icon: ASSETS.speciesPlatypusIcon,
    target: 'platypus',
  },
  { id: '06', name: 'UNKNOWN / REDACTED', count: 0, locked: true },
];

const ARTIFACT_DOSSIERS: Dossier[] = [
  {
    id: 'ARTF-001',
    name: 'THE VHS TAPE OF REGRET',
    status: 'INDEXED',
    classification: 'OBJECT / MEMETIC',
    date: '1994-11-03',
    summary:
      'Playback causes viewers to remember every social mistake they have ever made in broadcast order. Rewinding is prohibited.',
  },
  {
    id: 'ARTF-002',
    name: 'THE IMPOSSIBLE KEY',
    status: 'CONTAINED',
    classification: 'OBJECT / SPATIAL',
    date: '1979-06-21',
    summary:
      'Key fits locks that do not exist yet. Any opened door must be reported before personnel ask where it came from.',
  },
  {
    id: 'ARTF-003',
    name: 'THE HAT OF SUPERIORITY',
    status: 'MONITORED',
    classification: 'OBJECT / COGNITIVE',
    date: '1983-02-14',
    summary:
      'Wearer becomes certain they are the ranking authority in any room. Effect ends when hat is complimented sincerely.',
  },
  {
    id: 'ARTF-004',
    name: 'THE DAIRY ANOMALY',
    status: 'QUARANTINED',
    classification: 'OBJECT / BIOACTIVE',
    date: '2001-09-09',
    summary:
      'Carton remains full regardless of volume poured. Contents are nutritionally normal and emotionally judgmental.',
  },
  {
    id: 'ARTF-005',
    name: 'THE BUCKET THAT KNOWS',
    status: 'INDEXED',
    classification: 'OBJECT / ORACLE',
    date: '1998-05-27',
    summary:
      'Bucket answers yes-or-no questions through condensation patterns. It refuses to discuss mops.',
  },
  {
    id: 'ARTF-006',
    name: 'THE UNFLUSHABLE BOWL',
    status: 'RESTRICTED',
    classification: 'OBJECT / HYDRAULIC',
    date: '1966-01-19',
    summary:
      'Fixture resists all disposal attempts. Archive recommends acknowledging its victory before engaging secondary containment.',
  },
  {
    id: 'ARTF-007',
    name: 'FLEXIBLE ELASTOMERIC ISOLATION MEMBRANE',
    status: 'INDEXED',
    classification: 'OBJECT / BARRIER',
    date: '2004-08-12',
    summary:
      'Membrane displays inconsistent dimensional loyalty and refuses to be categorized by conventional procurement language.',
  },
  {
    id: 'ARTF-008',
    name: 'UNAUTHORIZED AUBERGINE',
    status: 'QUARANTINED',
    classification: 'OBJECT / AGRICULTURAL',
    date: '2011-04-23',
    summary:
      'Produce item manifests in restricted areas without badge access. Culinary personnel deny responsibility.',
  },
  {
    id: 'ARTF-009',
    name: 'COLD STORAGE UNIT 8',
    status: 'INDEXED',
    classification: 'OBJECT / THERMAL',
    date: '1999-12-08',
    summary:
      'Refrigeration unit maintains impossible interior volume and chills only items it considers sufficiently suspicious.',
  },
  {
    id: 'ARTF-010',
    name: 'ABSORBENT TEXTILE 6-B',
    status: 'MONITORED',
    classification: 'OBJECT / HYDROPHILIC',
    date: '2007-03-16',
    summary:
      'Textile absorbs moisture, apologies, and poorly phrased orders. Wringing produces classified condensation.',
  },
  {
    id: 'ARTF-011',
    name: 'DISPLACED-IMPACT HAMMER',
    status: 'CONTAINED',
    classification: 'OBJECT / KINETIC',
    date: '1988-08-31',
    summary:
      'Hammer impact is delivered three to nine seconds before the swing that causes it. Eye protection is mandatory before intent forms.',
  },
  {
    id: 'ARTF-012',
    name: 'PATTERNING NAIL CLIPPERS',
    status: 'INDEXED',
    classification: 'OBJECT / KERATIN',
    date: '2003-05-24',
    summary:
      'Clippers trim nails into repeating symbols that accurately predict which drawer contains missing batteries.',
  },
  {
    id: 'ARTF-013',
    name: 'INCOMMENSURATE MEASURING STICK',
    status: 'MONITORED',
    classification: 'OBJECT / METRIC',
    date: '1974-10-02',
    summary:
      'Measuring stick returns values that are internally consistent but incompatible with all known unit systems.',
  },
  {
    id: 'ARTF-014',
    name: 'PREEMPTIVE TISSUE DISPENSER',
    status: 'INDEXED',
    classification: 'OBJECT / ANTICIPATORY',
    date: '2015-01-11',
    summary:
      'Dispenser presents tissues shortly before sneezes, heartbreak, or unexpected mayonnaise incidents.',
  },
  {
    id: 'ARTF-022',
    name: 'CHARLES',
    status: 'CONTAINED',
    classification: 'OBJECT / PSY-INFLUENCE',
    date: '2026-06-19',
    summary:
      'Ham and Swiss sandwich exerts a non-verbal influence causing observers to agree that the artifact must be referred to as Charles.',
  },
];

const PLATYPUS_DOSSIER: Dossier = {
  id: 'PLTY-001',
  name: 'FATHER BILGEMOUTH',
  status: 'INDEXED',
  classification: 'TIER I',
  date: '1992-07-18',
  summary:
    'Single-entry species record. Subject displays improbable composure and refuses all conventional taxonomy jokes.',
};

const CORVID_DOSSIERS: Dossier[] = [
  {
    id: 'CRVD-001',
    name: 'THE RAFTER WATCHER',
    status: 'INDEXED',
    classification: 'TIER I',
    date: '1984-03-11',
    summary:
      'Subject observes archive staff from elevated structures and repeats overheard security phrases at inconvenient times.',
  },
  {
    id: 'CRVD-002',
    name: 'MIDNIGHT ACCOUNTANT',
    status: 'MONITORED',
    classification: 'TIER II',
    date: '1990-10-04',
    summary:
      'Corvid entity rearranges numerical records into accurate but deeply insulting budget forecasts.',
  },
  {
    id: 'CRVD-003',
    name: 'THE GLASS BEAK',
    status: 'CONTAINED',
    classification: 'TIER II',
    date: '1996-05-22',
    summary:
      'Specimen can peck through reflective surfaces only when unobserved by the assigned handler.',
  },
];

const BULLFROG_DOSSIERS: Dossier[] = [
  {
    id: 'BFRG-001',
    name: 'BARON BOGTHROAT',
    status: 'CONTAINED',
    classification: 'TIER I',
    date: '1981-06-19',
    summary:
      'Vocalizations cause nearby paperwork to become damp, notarized, and legally binding.',
  },
  {
    id: 'BFRG-002',
    name: 'THE POND NOTARY',
    status: 'INDEXED',
    classification: 'TIER I',
    date: '1989-09-03',
    summary:
      'Specimen witnesses verbal agreements and produces stamped lily pads within thirty seconds.',
  },
  {
    id: 'BFRG-003',
    name: 'MISTER CROAKWISE',
    status: 'MONITORED',
    classification: 'TIER II',
    date: '1997-02-15',
    summary:
      'Answers direct questions with unsettlingly useful advice, followed by thunder in enclosed rooms.',
  },
];

const NUTRIA_DOSSIERS: Dossier[] = [
  {
    id: 'NTRI-001',
    name: 'THE DITCH COUNT',
    status: 'MONITORED',
    classification: 'TIER I',
    date: '1986-12-02',
    summary:
      'Subject claims dominion over drainage infrastructure and responds poorly to municipal maps.',
  },
  {
    id: 'NTRI-002',
    name: 'SOGGY PRINCIPAL',
    status: 'INDEXED',
    classification: 'TIER I',
    date: '1993-04-08',
    summary:
      'Enforces unknown school policies in marshland areas. Detention slips are water-resistant.',
  },
  {
    id: 'NTRI-003',
    name: 'WHISKERED COMPLIANCE',
    status: 'CONTAINED',
    classification: 'TIER II',
    date: '2002-01-29',
    summary:
      'Conducts surprise inspections of sealed containers and approves only the least convenient option.',
  },
];

const ALL_DOSSIERS: Dossier[] = [
  ...CORVID_DOSSIERS,
  ...BULLFROG_DOSSIERS,
  ...DOSSIERS,
  ...NUTRIA_DOSSIERS,
  PLATYPUS_DOSSIER,
  ...ARTIFACT_DOSSIERS,
];

const ARTIFACTS_DATABASE: CategoryEntry[] = [
  {
    id: '01',
    name: 'THE VHS TAPE OF REGRET',
    count: 1,
    icon: ASSETS.artifactVhsTape,
    dossierId: 'ARTF-001',
  },
  {
    id: '02',
    name: 'THE IMPOSSIBLE KEY',
    count: 1,
    icon: ASSETS.artifactImpossibleKey,
    dossierId: 'ARTF-002',
  },
  {
    id: '03',
    name: 'THE HAT OF SUPERIORITY',
    count: 1,
    icon: ASSETS.artifactHatSuperiority,
    dossierId: 'ARTF-003',
  },
  {
    id: '04',
    name: 'THE DAIRY ANOMALY',
    count: 1,
    icon: ASSETS.artifactDairyAnomaly,
    dossierId: 'ARTF-004',
  },
  {
    id: '05',
    name: 'THE BUCKET THAT KNOWS',
    count: 1,
    icon: ASSETS.artifactBucketThatKnows,
    dossierId: 'ARTF-005',
  },
  {
    id: '06',
    name: 'THE UNFLUSHABLE BOWL',
    count: 1,
    icon: ASSETS.artifactUnflushableBowl,
    dossierId: 'ARTF-006',
  },
  {
    id: '07',
    name: 'FLEXIBLE ELASTOMERIC ISOLATION MEMBRANE',
    count: 1,
    icon: ASSETS.artifactIsolationMembrane,
    dossierId: 'ARTF-007',
  },
  {
    id: '08',
    name: 'UNAUTHORIZED AUBERGINE',
    count: 1,
    icon: ASSETS.artifactUnauthorizedAubergine,
    dossierId: 'ARTF-008',
  },
  {
    id: '09',
    name: 'COLD STORAGE UNIT 8',
    count: 1,
    icon: ASSETS.artifactColdStorageUnit,
    dossierId: 'ARTF-009',
  },
  {
    id: '10',
    name: 'ABSORBENT TEXTILE 6-B',
    count: 1,
    icon: ASSETS.artifactAbsorbentTextile,
    dossierId: 'ARTF-010',
  },
  {
    id: '11',
    name: 'DISPLACED-IMPACT HAMMER',
    count: 1,
    icon: ASSETS.artifactDisplacedImpactHammer,
    dossierId: 'ARTF-011',
  },
  {
    id: '12',
    name: 'PATTERNING NAIL CLIPPERS',
    count: 1,
    icon: ASSETS.artifactPatterningNailClippers,
    dossierId: 'ARTF-012',
  },
  {
    id: '13',
    name: 'INCOMMENSURATE MEASURING STICK',
    count: 1,
    icon: ASSETS.artifactIncommensurateMeasuringStick,
    dossierId: 'ARTF-013',
  },
  {
    id: '14',
    name: 'PREEMPTIVE TISSUE DISPENSER',
    count: 1,
    icon: ASSETS.artifactPreemptiveTissueDispenser,
    dossierId: 'ARTF-014',
  },
  {
    id: '15',
    name: 'CHARLES',
    count: 1,
    icon: ASSETS.artifactCharles,
    dossierId: 'ARTF-022',
  },
];

const UNLOCK_DURATION_MS = 380;
const DOOR_DURATION_MS = 600;
const LOCK_DURATION_MS = 380;
const BOOT_FLICKER_DURATION_MS = 1150;
const BOOT_DISPLAY_DURATION_MS = 1400;
const BOOT_LOADING_DURATION_MS = 2800;
const BOOT_GRANTED_DURATION_MS = 1000;
const RETRIEVAL_MIN_DURATION_MS = 1000;
const RETRIEVAL_MAX_DURATION_MS = 3000;
const LAYOUT_STORAGE_KEY = 'dars-1a-layout-adjustments-v3';
const LAYOUT_ASSETS = [
  { id: 'crt', label: 'CRT Screen' },
  { id: 'deviceHeader', label: 'Display Header' },
  { id: 'warningBanner', label: 'Warning Banner' },
  { id: 'crtTitleLine', label: 'CRT Title Line' },
  { id: 'crtLeftPanel', label: 'CRT Left Panel' },
  { id: 'crtRightTopPanel', label: 'CRT Right Top Panel' },
  { id: 'crtRightBottomPanel', label: 'CRT Right Bottom Panel' },
  { id: 'catSpecies', label: 'Category: Species' },
  { id: 'catArtifacts', label: 'Category: Artifacts' },
  { id: 'catEvents', label: 'Category: Events' },
  { id: 'catAnomalies', label: 'Category: Anomalies' },
  { id: 'rearBay', label: 'Rear Bay Group' },
  { id: 'bayCavity', label: 'Bay Cavity' },
  { id: 'bayRailLeft', label: 'Left Bay Rail' },
  { id: 'bayRailRight', label: 'Right Bay Rail' },
  { id: 'bayShadow', label: 'Bay Shadow' },
  { id: 'bayFrame', label: 'Bay Frame' },
  { id: 'shell', label: 'Main Shell' },
  { id: 'folder', label: 'Record Folder' },
  { id: 'frontBay', label: 'Door Stage' },
  { id: 'doorUpper', label: 'Upper Door' },
  { id: 'doorLower', label: 'Lower Door' },
  { id: 'latch', label: 'Bay Latch' },
  { id: 'shellOuterMask', label: 'Outer Shell Mask' },
  { id: 'guideLightTop', label: 'Guide Light: Top' },
  { id: 'guideLightBottom', label: 'Guide Light: Bottom' },
  { id: 'buttonMenu', label: 'Menu Button' },
  { id: 'buttonArchive', label: 'Archive Button' },
  { id: 'buttonBack', label: 'Back Button' },
] as const;

type LayoutAssetId = (typeof LAYOUT_ASSETS)[number]['id'];

type LayoutAdjustment = {
  x: number;
  y: number;
  scale: number;
  width: number;
  height: number;
};

type LayoutState = Record<LayoutAssetId, LayoutAdjustment>;

type SelectionRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type PointerOperation =
  | {
      mode: 'move';
      assetId: LayoutAssetId;
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
      coordinateWidth: number;
      coordinateHeight: number;
    }
  | {
      mode: 'resize';
      assetId: LayoutAssetId;
      centerX: number;
      centerY: number;
      startDistance: number;
      startScale: number;
    };

type LayoutCssProperties = CSSProperties & {
  '--layout-x'?: string;
  '--layout-y'?: string;
  '--layout-scale'?: number;
  '--layout-scale-x'?: number;
  '--layout-scale-y'?: number;
};

/*
 * Calibrated baseline layout (captured from the in-app layout editor).
 * Typed as LayoutState so every asset in LAYOUT_ASSETS must have an entry.
 * A saved layout in localStorage still overrides these per-asset.
 */
const DEFAULT_LAYOUT: LayoutState = {
  crt: { x: -0.001, y: 1.547, scale: 1, width: 1, height: 1 },
  deviceHeader: { x: 0.002, y: 1.652, scale: 1.03, width: 1, height: 1 },
  warningBanner: { x: 0.1, y: -945.432, scale: 2.73, width: 1, height: 1 },
  crtTitleLine: { x: -0.605, y: 2.047, scale: 0.56, width: 1.64, height: 1.49 },
  crtLeftPanel: { x: -0.609, y: 4.43, scale: 1.025, width: 1, height: 1 },
  crtRightTopPanel: { x: 4.259, y: 6.475, scale: 1, width: 1, height: 1 },
  crtRightBottomPanel: { x: 1.826, y: 4.771, scale: 0.898, width: 1, height: 1 },
  catSpecies: { x: -5.234, y: 8.212, scale: 1.21, width: 1, height: 1.15 },
  catArtifacts: { x: 3.651, y: 8.623, scale: 1.19, width: 0.99, height: 1.22 },
  catEvents: { x: -4.869, y: 17.799, scale: 1.15, width: 1.01, height: 1.18 },
  catAnomalies: { x: 3.954, y: 17.31, scale: 1.15, width: 1.01, height: 1.16 },
  rearBay: { x: 0, y: -0.412, scale: 1, width: 1, height: 1 },
  bayCavity: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  bayRailLeft: { x: -5.5, y: 0, scale: 1, width: 1, height: 1 },
  bayRailRight: { x: 9.25, y: 0, scale: 1, width: 1, height: 1 },
  bayShadow: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  bayFrame: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  shell: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  folder: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  frontBay: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  doorUpper: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  doorLower: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  latch: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  shellOuterMask: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  guideLightTop: { x: -0.769, y: 9.794, scale: 1.89, width: 0.56, height: 1 },
  guideLightBottom: { x: 0, y: 1.857, scale: 2.16, width: 0.49, height: 1 },
  buttonMenu: { x: -1.924, y: 2.579, scale: 1.41, width: 1, height: 1 },
  buttonArchive: { x: 6.729, y: 3.198, scale: 1.78, width: 1, height: 1 },
  buttonBack: { x: 7.5, y: 2.991, scale: 1.7, width: 1, height: 1 },
};

function createDefaultLayout(): LayoutState {
  return Object.fromEntries(
    LAYOUT_ASSETS.map(({ id }) => [id, { ...DEFAULT_LAYOUT[id] }]),
  ) as LayoutState;
}

function loadSavedLayout(): LayoutState {
  const defaults = createDefaultLayout();

  try {
    const rawLayout = window.localStorage.getItem(LAYOUT_STORAGE_KEY);

    if (!rawLayout) {
      return defaults;
    }

    const parsedLayout = JSON.parse(rawLayout) as Partial<LayoutState>;
    LAYOUT_ASSETS.forEach(({ id }) => {
      const savedAdjustment = parsedLayout[id];

      if (!savedAdjustment) {
        return;
      }

      defaults[id] = {
        x: Number.isFinite(savedAdjustment.x) ? savedAdjustment.x : 0,
        y: Number.isFinite(savedAdjustment.y) ? savedAdjustment.y : 0,
        scale: Number.isFinite(savedAdjustment.scale)
          ? Math.max(0.1, savedAdjustment.scale)
          : 1,
        width: Number.isFinite(savedAdjustment.width)
          ? Math.max(0.1, savedAdjustment.width)
          : 1,
        height: Number.isFinite(savedAdjustment.height)
          ? Math.max(0.1, savedAdjustment.height)
          : 1,
      };
    });
  } catch (error) {
    console.warn('Unable to load the saved DARS layout.', error);
  }

  return defaults;
}

function roundLayoutValue(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function App() {
  const [bayState, setBayState] = useState<BayState>('closed');
  const [editMode] = useState(false);
  const [selectedAssetId, setSelectedAssetId] =
    useState<LayoutAssetId>('buttonArchive');
  const [layout, setLayout] = useState<LayoutState>(loadSavedLayout);
  const [selectionRect, setSelectionRect] =
    useState<SelectionRect | null>(null);
  const [screen, setScreen] = useState<ScreenId>('home');
  const [bootPhase, setBootPhase] = useState<BootPhase>('flicker');
  const [bootProgress, setBootProgress] = useState(0);
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(
    null,
  );
  const [dossierReturnScreen, setDossierReturnScreen] =
    useState<ScreenId>('wombats');
  const [deliveryPhase, setDeliveryPhase] = useState<DeliveryPhase | null>(
    null,
  );
  const [pendingNavigation, setPendingNavigation] = useState<ScreenId | null>(
    null,
  );
  const [activeDossierSheet, setActiveDossierSheet] = useState<{
    src: string;
    title: string;
  } | null>(null);

  const deviceRef = useRef<HTMLElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const layoutNodesRef = useRef(new Map<LayoutAssetId, HTMLElement>());
  const pointerOperationRef = useRef<PointerOperation | null>(null);

  const isBusy =
    bayState === 'unlocking' ||
    bayState === 'opening' ||
    bayState === 'closing' ||
    bayState === 'locking';

  const selectedDossier =
    ALL_DOSSIERS.find((dossier) => dossier.id === selectedDossierId) ?? null;
  const isAssetReady = Boolean(selectedDossier);
  const selectedDossierSheetSrc = getDossierSheetSrc(selectedDossier?.id);
  const areGuideLightsActive =
    bootPhase === 'granted' || bootPhase === 'ready';

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  }, []);

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timerId = window.setTimeout(callback, delay);
    timersRef.current.push(timerId);
  }, []);

  const setLayoutNode = useCallback(
    (assetId: LayoutAssetId, node: HTMLElement | null) => {
      if (node) {
        layoutNodesRef.current.set(assetId, node);
        return;
      }

      layoutNodesRef.current.delete(assetId);
    },
    [],
  );

  const updateAsset = useCallback(
    (
      assetId: LayoutAssetId,
      updates:
        | Partial<LayoutAdjustment>
        | ((current: LayoutAdjustment) => Partial<LayoutAdjustment>),
    ) => {
      setLayout((currentLayout) => {
        const currentAdjustment = currentLayout[assetId];
        const nextUpdates =
          typeof updates === 'function' ? updates(currentAdjustment) : updates;
        const nextLayout = {
          ...currentLayout,
          [assetId]: {
            ...currentAdjustment,
            ...nextUpdates,
          },
        };

        window.localStorage.setItem(
          LAYOUT_STORAGE_KEY,
          JSON.stringify(nextLayout),
        );

        return nextLayout;
      });
    },
    [],
  );

  const getOffsetStyle = useCallback(
    (assetId: LayoutAssetId): LayoutCssProperties => ({
      '--layout-x': `${layout[assetId].x}%`,
      '--layout-y': `${layout[assetId].y}%`,
    }),
    [layout],
  );

  const getScaleStyle = useCallback(
    (assetId: LayoutAssetId): LayoutCssProperties => ({
      '--layout-scale': layout[assetId].scale,
      '--layout-scale-x': layout[assetId].scale * layout[assetId].width,
      '--layout-scale-y': layout[assetId].scale * layout[assetId].height,
    }),
    [layout],
  );

  const closeBay = useCallback(() => {
    if (editMode || bayState !== 'open') {
      return;
    }

    setActiveDossierSheet(null);
    clearTimers();
    setBayState('closing');
    schedule(() => setBayState('locking'), DOOR_DURATION_MS);
    schedule(() => setBayState('closed'), DOOR_DURATION_MS + LOCK_DURATION_MS);
  }, [bayState, clearTimers, editMode, schedule]);

  const closeDossierSheet = useCallback(() => {
    setActiveDossierSheet(null);
  }, []);

  const openDossierSheet = useCallback(() => {
    if (
      editMode ||
      bayState !== 'open' ||
      !selectedDossier ||
      !selectedDossierSheetSrc
    ) {
      return;
    }

    setActiveDossierSheet({
      src: selectedDossierSheetSrc,
      title: selectedDossier.name,
    });
  }, [bayState, editMode, selectedDossier, selectedDossierSheetSrc]);

  const beginRetrieval = useCallback(
    (returnScreen: ScreenId, showDossierScreen: boolean) => {
      if (bayState !== 'closed') {
        return;
      }

      const retrievalDuration =
        RETRIEVAL_MIN_DURATION_MS +
        Math.round(
          Math.random() *
            (RETRIEVAL_MAX_DURATION_MS - RETRIEVAL_MIN_DURATION_MS),
        );

      clearTimers();
      setDossierReturnScreen(returnScreen);
      setDeliveryPhase('retrieving');

      if (showDossierScreen) {
        setScreen('dossier');
      }

      schedule(() => {
        setDeliveryPhase('retrieved');
        setBayState('unlocking');
      }, retrievalDuration);
      schedule(
        () => setBayState('opening'),
        retrievalDuration + UNLOCK_DURATION_MS,
      );
      schedule(
        () => setBayState('open'),
        retrievalDuration + UNLOCK_DURATION_MS + DOOR_DURATION_MS,
      );
    },
    [bayState, clearTimers, schedule],
  );

  const handleArchive = useCallback(() => {
    if (editMode || isBusy) {
      return;
    }

    if (bayState === 'closed') {
      if (!selectedDossier) {
        return;
      }

      setActiveDossierSheet(null);
      beginRetrieval(dossierReturnScreen, dossierReturnScreen !== 'objects');
      return;
    }

    if (bayState === 'open') {
      const returnDestination = dossierReturnScreen;

      setActiveDossierSheet(null);
      setDeliveryPhase(null);
      setSelectedDossierId(null);
      setDossierReturnScreen('wombats');
      setScreen(returnDestination);
      closeBay();
    }
  }, [
    bayState,
    beginRetrieval,
    closeBay,
    dossierReturnScreen,
    editMode,
    isBusy,
    selectedDossier,
  ]);

  const handleMenu = useCallback(() => {
    if (
      editMode ||
      isBusy ||
      pendingNavigation ||
      deliveryPhase === 'retrieving'
    ) {
      return;
    }

    setDeliveryPhase(null);
    setActiveDossierSheet(null);

    if (bayState === 'open') {
      setPendingNavigation('home');
      closeBay();
      return;
    }

    setScreen('home');
  }, [bayState, closeBay, deliveryPhase, editMode, isBusy, pendingNavigation]);

  const openDossier = useCallback((id: string) => {
    if (isBusy) {
      return;
    }

    setDossierReturnScreen(getDossierRegistryScreen(id));
    setDeliveryPhase(null);
    setActiveDossierSheet(null);
    setSelectedDossierId(id);
  }, [isBusy]);

  const deliverDossier = useCallback(
    (id: string, returnScreen: ScreenId, showDossierScreen = true) => {
      if (editMode || isBusy || pendingNavigation) {
        return;
      }

      if (!ALL_DOSSIERS.some((dossier) => dossier.id === id)) {
        return;
      }

      setDossierReturnScreen(returnScreen);
      setSelectedDossierId(id);
      setActiveDossierSheet(null);

      if (showDossierScreen) {
        setScreen('dossier');
      }
    },
    [editMode, isBusy, pendingNavigation],
  );

  const navigateToScreen = useCallback(
    (nextScreen: ScreenId) => {
      if (editMode || isBusy || pendingNavigation) {
        return;
      }

      setDeliveryPhase(null);
      setActiveDossierSheet(null);
      setSelectedDossierId(null);
      setDossierReturnScreen('wombats');
      setScreen(nextScreen);
    },
    [editMode, isBusy, pendingNavigation],
  );

  const getBackDestination = useCallback((currentScreen: ScreenId): ScreenId => {
    if (currentScreen === 'dossier') {
      return dossierReturnScreen;
    }

    if (
      currentScreen === 'corvids' ||
      currentScreen === 'bullfrogs' ||
      currentScreen === 'wombats' ||
      currentScreen === 'nutrias' ||
      currentScreen === 'platypus'
    ) {
      return 'species';
    }

    if (
      currentScreen === 'species' ||
      currentScreen === 'objects' ||
      currentScreen === 'events' ||
      currentScreen === 'anomalies'
    ) {
      return 'menu';
    }

    return 'home';
  }, [dossierReturnScreen]);

  const handleBack = useCallback(() => {
    if (
      editMode ||
      isBusy ||
      pendingNavigation ||
      deliveryPhase === 'retrieving'
    ) {
      return;
    }

    setDeliveryPhase(null);
    setActiveDossierSheet(null);

    if (bayState === 'open') {
      const returnDestination = dossierReturnScreen;

      setActiveDossierSheet(null);
      setDeliveryPhase(null);
      setSelectedDossierId(null);
      setDossierReturnScreen('wombats');
      setScreen(returnDestination);
      closeBay();
      return;
    }

    setSelectedDossierId(null);
    setDossierReturnScreen('wombats');
    setScreen((currentScreen) => getBackDestination(currentScreen));
  }, [
    bayState,
    closeBay,
    deliveryPhase,
    editMode,
    getBackDestination,
    isBusy,
    pendingNavigation,
    screen,
  ]);

  const beginMove = useCallback(
    (
      event: ReactPointerEvent<HTMLElement>,
      assetId: LayoutAssetId,
    ) => {
      if (!editMode || event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const coordinateSpace = event.currentTarget.parentElement;

      if (!coordinateSpace) {
        return;
      }

      const coordinateRect = coordinateSpace.getBoundingClientRect();
      const adjustment = layout[assetId];

      setSelectedAssetId(assetId);
      pointerOperationRef.current = {
        mode: 'move',
        assetId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: adjustment.x,
        startY: adjustment.y,
        coordinateWidth: Math.max(1, coordinateRect.width),
        coordinateHeight: Math.max(1, coordinateRect.height),
      };
    },
    [editMode, layout],
  );

  const beginResize = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!editMode || event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const selectedNode = layoutNodesRef.current.get(selectedAssetId);

      if (!selectedNode) {
        return;
      }

      const selectedRect = selectedNode.getBoundingClientRect();
      const centerX = selectedRect.left + selectedRect.width / 2;
      const centerY = selectedRect.top + selectedRect.height / 2;
      const startDistance = Math.max(
        1,
        Math.hypot(event.clientX - centerX, event.clientY - centerY),
      );

      pointerOperationRef.current = {
        mode: 'resize',
        assetId: selectedAssetId,
        centerX,
        centerY,
        startDistance,
        startScale: layout[selectedAssetId].scale,
      };
    },
    [editMode, layout, selectedAssetId],
  );

  const handleDeviceButtonPointerDown = useCallback(
    (
      event: ReactPointerEvent<HTMLButtonElement>,
      assetId: LayoutAssetId,
    ) => {
      if (!editMode) {
        return;
      }

      beginMove(event, assetId);
    },
    [beginMove, editMode],
  );

  const nudgeSelectedAsset = useCallback(
    (pixelX: number, pixelY: number) => {
      const selectedNode = layoutNodesRef.current.get(selectedAssetId);
      const coordinateSpace = selectedNode?.parentElement;

      if (!coordinateSpace) {
        return;
      }

      const coordinateRect = coordinateSpace.getBoundingClientRect();
      updateAsset(selectedAssetId, (currentAdjustment) => ({
        x: roundLayoutValue(
          currentAdjustment.x +
            (pixelX / Math.max(1, coordinateRect.width)) * 100,
        ),
        y: roundLayoutValue(
          currentAdjustment.y +
            (pixelY / Math.max(1, coordinateRect.height)) * 100,
        ),
      }));
    },
    [selectedAssetId, updateAsset],
  );

  const refreshSelectionRect = useCallback(() => {
    if (!editMode) {
      setSelectionRect(null);
      return;
    }

    const selectedNode = layoutNodesRef.current.get(selectedAssetId);
    const deviceNode = deviceRef.current;

    if (!selectedNode || !deviceNode) {
      setSelectionRect(null);
      return;
    }

    const selectedRect = selectedNode.getBoundingClientRect();
    const deviceRect = deviceNode.getBoundingClientRect();

    setSelectionRect({
      left: selectedRect.left - deviceRect.left,
      top: selectedRect.top - deviceRect.top,
      width: selectedRect.width,
      height: selectedRect.height,
    });
  }, [editMode, selectedAssetId]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    const timers = [
      window.setTimeout(
        () => setBootPhase('display'),
        BOOT_FLICKER_DURATION_MS,
      ),
      window.setTimeout(
        () => setBootPhase('loading'),
        BOOT_FLICKER_DURATION_MS + BOOT_DISPLAY_DURATION_MS,
      ),
    ];

    return () => timers.forEach((timerId) => window.clearTimeout(timerId));
  }, []);

  useEffect(() => {
    if (bootPhase !== 'loading') {
      return undefined;
    }

    let frameId = 0;
    let startTime = 0;

    const step = (now: number) => {
      if (!startTime) {
        startTime = now;
      }

      const progress = Math.min(1, (now - startTime) / BOOT_LOADING_DURATION_MS);
      setBootProgress(progress);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(step);
        return;
      }

      setBootPhase('granted');
    };

    frameId = window.requestAnimationFrame(step);

    return () => window.cancelAnimationFrame(frameId);
  }, [bootPhase]);

  useEffect(() => {
    if (bootPhase !== 'granted') {
      return undefined;
    }

    const timerId = window.setTimeout(
      () => setBootPhase('ready'),
      BOOT_GRANTED_DURATION_MS,
    );

    return () => window.clearTimeout(timerId);
  }, [bootPhase]);

  useEffect(() => {
    if (bayState !== 'closed' || !pendingNavigation) {
      return;
    }

    setDeliveryPhase(null);
    setScreen(pendingNavigation);
    setPendingNavigation(null);
    setSelectedDossierId(null);
    setDossierReturnScreen('wombats');
  }, [bayState, pendingNavigation]);

  useEffect(() => {
    if (!editMode) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const operation = pointerOperationRef.current;

      if (!operation) {
        return;
      }

      if (operation.mode === 'move') {
        const deltaX =
          ((event.clientX - operation.startClientX) /
            operation.coordinateWidth) *
          100;
        const deltaY =
          ((event.clientY - operation.startClientY) /
            operation.coordinateHeight) *
          100;

        updateAsset(operation.assetId, {
          x: roundLayoutValue(operation.startX + deltaX),
          y: roundLayoutValue(operation.startY + deltaY),
        });
        return;
      }

      const distance = Math.max(
        1,
        Math.hypot(
          event.clientX - operation.centerX,
          event.clientY - operation.centerY,
        ),
      );
      const scale = Math.min(
        5,
        Math.max(
          0.1,
          operation.startScale * (distance / operation.startDistance),
        ),
      );

      updateAsset(operation.assetId, {
        scale: roundLayoutValue(scale),
      });
    };

    const endPointerOperation = () => {
      pointerOperationRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', endPointerOperation);
    window.addEventListener('pointercancel', endPointerOperation);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', endPointerOperation);
      window.removeEventListener('pointercancel', endPointerOperation);
    };
  }, [editMode, updateAsset]);

  useEffect(() => {
    if (!editMode) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.key.startsWith('Arrow')) {
        return;
      }

      event.preventDefault();
      const amount = event.shiftKey ? 10 : 1;

      if (event.key === 'ArrowUp') {
        nudgeSelectedAsset(0, -amount);
      }
      if (event.key === 'ArrowDown') {
        nudgeSelectedAsset(0, amount);
      }
      if (event.key === 'ArrowLeft') {
        nudgeSelectedAsset(-amount, 0);
      }
      if (event.key === 'ArrowRight') {
        nudgeSelectedAsset(amount, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editMode, nudgeSelectedAsset]);

  useLayoutEffect(() => {
    const frameId = window.requestAnimationFrame(refreshSelectionRect);
    return () => window.cancelAnimationFrame(frameId);
  }, [bayState, editMode, layout, refreshSelectionRect, selectedAssetId]);

  useEffect(() => {
    if (!editMode) {
      return undefined;
    }

    const handleResize = () => refreshSelectionRect();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [editMode, refreshSelectionRect]);

  return (
    <div className="app">
      <main className="device-stage">
        <section
          ref={deviceRef}
          className={`dars-device dars-device--${bayState}${
            editMode ? ' layout-editing' : ''
          }`}
          aria-label="DARS-1A Directorate Archive Retrieval System"
        >
          <DeviceLayer
            assetId="crt"
            className="layout-offset--crt"
            getOffsetStyle={getOffsetStyle}
          >
            <div
              ref={(node) => setLayoutNode('crt', node)}
              className={`crt-screen layout-editable${
                bootPhase === 'flicker' ? ' crt-screen--booting' : ''
              }`}
              style={getScaleStyle('crt')}
              data-layout-id="crt"
              onPointerDown={(event) => beginMove(event, 'crt')}
            >
              <div className="crt-base-glow" />
              <div className="crt-scanlines" />
              <div className="crt-content">
                {bootPhase === 'ready' ? (
                  <DossierBrowser
                    screen={screen}
                    dossiers={DOSSIERS}
                    selectedDossierId={selectedDossierId}
                    selectedDossier={selectedDossier}
                    deliveryPhase={deliveryPhase}
                    getOffsetStyle={getOffsetStyle}
                    getScaleStyle={getScaleStyle}
                    setLayoutNode={setLayoutNode}
                    beginMove={beginMove}
                    onEnterArchive={() => navigateToScreen('menu')}
                    onSelectSpecies={() => navigateToScreen('species')}
                    onSelectObjects={() => navigateToScreen('objects')}
                    onSelectEvents={() => navigateToScreen('events')}
                    onSelectAnomalies={() => navigateToScreen('anomalies')}
                    onOpenSpeciesRegistry={navigateToScreen}
                    onOpenDossier={openDossier}
                    onDeliverDossier={deliverDossier}
                  />
                ) : (
                  <BootScreen phase={bootPhase} progress={bootProgress} />
                )}
              </div>
              <img
                className="crt-glass-overlay"
                src={ASSETS.crtGlass}
                alt=""
                aria-hidden="true"
                draggable="false"
              />
              <div className="crt-reflection" />
            </div>
          </DeviceLayer>

          <DeviceLayer
            assetId="deviceHeader"
            className="layout-offset--device-header"
            getOffsetStyle={getOffsetStyle}
          >
            <div
              ref={(node) => setLayoutNode('deviceHeader', node)}
              className="device-status-banner layout-editable"
              style={getScaleStyle('deviceHeader')}
              data-layout-id="deviceHeader"
              onPointerDown={(event) => beginMove(event, 'deviceHeader')}
            >
              <div className="archive-battery" aria-label="Battery 87 percent">
                <span className="archive-battery__cell" />
                <span>87%</span>
              </div>
              <strong>SECURE LINK</strong>
              <div className="archive-signal" aria-label="Signal strong">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </DeviceLayer>

          <DeviceLayer
            assetId="warningBanner"
            className="layout-offset--warning-banner"
            getOffsetStyle={getOffsetStyle}
          >
            <div
              ref={(node) => setLayoutNode('warningBanner', node)}
              className="warning-plaque warning-plaque--device layout-editable"
              style={getScaleStyle('warningBanner')}
              data-layout-id="warningBanner"
              role="status"
              onPointerDown={(event) => beginMove(event, 'warningBanner')}
            >
              <span className="warning-stripes" aria-hidden="true" />
              <div>
                <strong>WARNING</strong>
                <span>UNAUTHORIZED ACCESS IS PUNISHABLE BY LAW</span>
              </div>
              <span className="warning-stripes" aria-hidden="true" />
            </div>
          </DeviceLayer>

          <RearBay
            bayState={bayState}
            editMode={editMode}
            getOffsetStyle={getOffsetStyle}
            getScaleStyle={getScaleStyle}
            setLayoutNode={setLayoutNode}
            beginMove={beginMove}
          />

          <ImageLayer
            assetId="shell"
            wrapperClassName="layout-offset--shell"
            imageClassName="dars-shell layout-editable layout-editable--passive"
            src={ASSETS.shell}
            getOffsetStyle={getOffsetStyle}
            getScaleStyle={getScaleStyle}
            setLayoutNode={setLayoutNode}
            beginMove={beginMove}
            passive
          />

          <ImageLayer
            assetId="folder"
            wrapperClassName="layout-offset--folder"
            imageClassName="bay-folder layout-editable"
            src={ASSETS.containmentFolder}
            getOffsetStyle={getOffsetStyle}
            getScaleStyle={getScaleStyle}
            setLayoutNode={setLayoutNode}
            beginMove={beginMove}
            onClick={openDossierSheet}
          />

          <FrontBay
            getOffsetStyle={getOffsetStyle}
            getScaleStyle={getScaleStyle}
            setLayoutNode={setLayoutNode}
            beginMove={beginMove}
            editMode={editMode}
          />

          <ImageLayer
            assetId="shellOuterMask"
            wrapperClassName="layout-offset--outer-mask"
            imageClassName="dars-shell-outer-mask layout-editable layout-editable--passive"
            src={ASSETS.shellOuterMask}
            getOffsetStyle={getOffsetStyle}
            getScaleStyle={getScaleStyle}
            setLayoutNode={setLayoutNode}
            beginMove={beginMove}
            passive
          />

          <DeviceLayer
            assetId="guideLightTop"
            className="layout-offset--guide-light-top"
            getOffsetStyle={getOffsetStyle}
          >
            <span
              ref={(node) => setLayoutNode('guideLightTop', node)}
              className={`shell-guide-light shell-guide-light--top layout-editable${
                areGuideLightsActive ? ' shell-guide-light--active' : ''
              }`}
              style={getScaleStyle('guideLightTop')}
              data-layout-id="guideLightTop"
              aria-hidden="true"
              onPointerDown={(event) => beginMove(event, 'guideLightTop')}
            />
          </DeviceLayer>

          <DeviceLayer
            assetId="guideLightBottom"
            className="layout-offset--guide-light-bottom"
            getOffsetStyle={getOffsetStyle}
          >
            <span
              ref={(node) => setLayoutNode('guideLightBottom', node)}
              className={`shell-guide-light shell-guide-light--bottom layout-editable${
                areGuideLightsActive ? ' shell-guide-light--active' : ''
              }`}
              style={getScaleStyle('guideLightBottom')}
              data-layout-id="guideLightBottom"
              aria-hidden="true"
              onPointerDown={(event) => beginMove(event, 'guideLightBottom')}
            />
          </DeviceLayer>

          <DeviceButton
            assetId="buttonMenu"
            wrapperClassName="layout-offset--button-menu"
            className="device-button--menu"
            label="Menu"
            imgSrc={ASSETS.buttonMenu}
            disabled={!editMode && (isBusy || deliveryPhase === 'retrieving')}
            getOffsetStyle={getOffsetStyle}
            getScaleStyle={getScaleStyle}
            setLayoutNode={setLayoutNode}
            onPointerDown={(event) =>
              handleDeviceButtonPointerDown(event, 'buttonMenu')
            }
            onClick={handleMenu}
          />

          <DeviceButton
            assetId="buttonArchive"
            wrapperClassName="layout-offset--button-archive"
            className={`device-button--archive${
              isAssetReady ? ' device-button--ready' : ''
            }`}
            label={
              editMode
                ? 'Archive button layout asset'
                : bayState === 'open'
                  ? 'Close archive retrieval bay'
                  : 'Open archive retrieval bay'
            }
            imgSrc={ASSETS.buttonArchive}
            disabled={!editMode && (isBusy || deliveryPhase === 'retrieving')}
            getOffsetStyle={getOffsetStyle}
            getScaleStyle={getScaleStyle}
            setLayoutNode={setLayoutNode}
            onPointerDown={(event) =>
              handleDeviceButtonPointerDown(event, 'buttonArchive')
            }
            onClick={handleArchive}
          />

          <DeviceButton
            assetId="buttonBack"
            wrapperClassName="layout-offset--button-back"
            className="device-button--back"
            label="Back"
            imgSrc={ASSETS.buttonBack}
            disabled={!editMode && (isBusy || deliveryPhase === 'retrieving')}
            getOffsetStyle={getOffsetStyle}
            getScaleStyle={getScaleStyle}
            setLayoutNode={setLayoutNode}
            onPointerDown={(event) =>
              handleDeviceButtonPointerDown(event, 'buttonBack')
            }
            onClick={handleBack}
          />

          {editMode && selectionRect && (
            <div
              className="layout-selection"
              style={{
                left: selectionRect.left,
                top: selectionRect.top,
                width: selectionRect.width,
                height: selectionRect.height,
              }}
              aria-hidden="true"
            >
              <span className="layout-selection__label">
                {
                  LAYOUT_ASSETS.find(({ id }) => id === selectedAssetId)
                    ?.label
                }
              </span>
              <button
                className="layout-selection__resize"
                type="button"
                onPointerDown={beginResize}
                tabIndex={-1}
                aria-label="Resize selected asset"
              />
            </div>
          )}
        </section>
      </main>

      {activeDossierSheet && (
        <div
          className="dossier-sheet-viewer"
          role="dialog"
          aria-modal="true"
          aria-label={`${activeDossierSheet.title} dossier`}
        >
          <button
            className="dossier-sheet-viewer__close"
            type="button"
            onClick={closeDossierSheet}
          >
            Close
          </button>
          <img
            src={activeDossierSheet.src}
            alt={`${activeDossierSheet.title} dossier`}
            draggable="false"
          />
        </div>
      )}
    </div>
  );
}

function DeviceLayer({
  assetId,
  className,
  getOffsetStyle,
  children,
}: {
  assetId: LayoutAssetId;
  className: string;
  getOffsetStyle: (assetId: LayoutAssetId) => LayoutCssProperties;
  children: React.ReactNode;
}) {
  return (
    <div className={`layout-offset ${className}`} style={getOffsetStyle(assetId)}>
      {children}
    </div>
  );
}

function ImageLayer({
  assetId,
  wrapperClassName,
  imageClassName,
  src,
  getOffsetStyle,
  getScaleStyle,
  setLayoutNode,
  beginMove,
  passive = false,
  onClick,
}: {
  assetId: LayoutAssetId;
  wrapperClassName: string;
  imageClassName: string;
  src: string;
  getOffsetStyle: (assetId: LayoutAssetId) => LayoutCssProperties;
  getScaleStyle: (assetId: LayoutAssetId) => LayoutCssProperties;
  setLayoutNode: (assetId: LayoutAssetId, node: HTMLElement | null) => void;
  beginMove: (
    event: ReactPointerEvent<HTMLElement>,
    assetId: LayoutAssetId,
  ) => void;
  passive?: boolean;
  onClick?: () => void;
}) {
  return (
    <DeviceLayer
      assetId={assetId}
      className={wrapperClassName}
      getOffsetStyle={getOffsetStyle}
    >
      <img
        ref={(node) => setLayoutNode(assetId, node)}
        className={imageClassName}
        style={getScaleStyle(assetId)}
        data-layout-id={assetId}
        src={src}
        alt=""
        aria-hidden={passive}
        draggable="false"
        onPointerDown={(event) => beginMove(event, assetId)}
        onClick={onClick}
      />
    </DeviceLayer>
  );
}

function RearBay({
  bayState,
  editMode,
  getOffsetStyle,
  getScaleStyle,
  setLayoutNode,
  beginMove,
}: {
  bayState: BayState;
  editMode: boolean;
  getOffsetStyle: (assetId: LayoutAssetId) => LayoutCssProperties;
  getScaleStyle: (assetId: LayoutAssetId) => LayoutCssProperties;
  setLayoutNode: (assetId: LayoutAssetId, node: HTMLElement | null) => void;
  beginMove: (
    event: ReactPointerEvent<HTMLElement>,
    assetId: LayoutAssetId,
  ) => void;
}) {
  return (
    <DeviceLayer
      assetId="rearBay"
      className="layout-offset--rear-bay"
      getOffsetStyle={getOffsetStyle}
    >
      <div
        ref={(node) => setLayoutNode('rearBay', node)}
        className="retrieval-bay--rear layout-editable"
        style={getScaleStyle('rearBay')}
        data-layout-id="rearBay"
        aria-hidden={bayState !== 'open' && !editMode}
        onPointerDown={(event) => beginMove(event, 'rearBay')}
      >
        <ImageLayer
          assetId="bayCavity"
          wrapperClassName="layout-offset--bay-cavity"
          imageClassName="bay-layer bay-cavity layout-editable"
          src={ASSETS.bayCavity}
          getOffsetStyle={getOffsetStyle}
          getScaleStyle={getScaleStyle}
          setLayoutNode={setLayoutNode}
          beginMove={beginMove}
        />
        <ImageLayer
          assetId="bayRailLeft"
          wrapperClassName="layout-offset--bay-rail-left"
          imageClassName="bay-layer bay-rail bay-rail--left layout-editable"
          src={ASSETS.bayRailLeft}
          getOffsetStyle={getOffsetStyle}
          getScaleStyle={getScaleStyle}
          setLayoutNode={setLayoutNode}
          beginMove={beginMove}
        />
        <ImageLayer
          assetId="bayRailRight"
          wrapperClassName="layout-offset--bay-rail-right"
          imageClassName="bay-layer bay-rail bay-rail--right layout-editable"
          src={ASSETS.bayRailRight}
          getOffsetStyle={getOffsetStyle}
          getScaleStyle={getScaleStyle}
          setLayoutNode={setLayoutNode}
          beginMove={beginMove}
        />
        <ImageLayer
          assetId="bayShadow"
          wrapperClassName="layout-offset--bay-shadow"
          imageClassName="bay-layer bay-shadow layout-editable"
          src={ASSETS.bayShadow}
          getOffsetStyle={getOffsetStyle}
          getScaleStyle={getScaleStyle}
          setLayoutNode={setLayoutNode}
          beginMove={beginMove}
        />
        <ImageLayer
          assetId="bayFrame"
          wrapperClassName="layout-offset--bay-frame"
          imageClassName="bay-layer bay-frame layout-editable"
          src={ASSETS.bayFrame}
          getOffsetStyle={getOffsetStyle}
          getScaleStyle={getScaleStyle}
          setLayoutNode={setLayoutNode}
          beginMove={beginMove}
        />
      </div>
    </DeviceLayer>
  );
}

function FrontBay({
  getOffsetStyle,
  getScaleStyle,
  setLayoutNode,
  beginMove,
  editMode,
}: {
  getOffsetStyle: (assetId: LayoutAssetId) => LayoutCssProperties;
  getScaleStyle: (assetId: LayoutAssetId) => LayoutCssProperties;
  setLayoutNode: (assetId: LayoutAssetId, node: HTMLElement | null) => void;
  beginMove: (
    event: ReactPointerEvent<HTMLElement>,
    assetId: LayoutAssetId,
  ) => void;
  editMode: boolean;
}) {
  return (
    <DeviceLayer
      assetId="frontBay"
      className="layout-offset--front-bay"
      getOffsetStyle={getOffsetStyle}
    >
      <div
        ref={(node) => setLayoutNode('frontBay', node)}
        className="retrieval-bay--front layout-editable"
        style={getScaleStyle('frontBay')}
        data-layout-id="frontBay"
        aria-hidden={!editMode}
        onPointerDown={(event) => beginMove(event, 'frontBay')}
      >
        <div className="door-mask door-mask--upper">
          <ImageLayer
            assetId="doorUpper"
            wrapperClassName="layout-offset--door-upper"
            imageClassName="door-panel door-panel--upper layout-editable"
            src={ASSETS.doorUpper}
            getOffsetStyle={getOffsetStyle}
            getScaleStyle={getScaleStyle}
            setLayoutNode={setLayoutNode}
            beginMove={beginMove}
          />
        </div>
        <div className="door-mask door-mask--lower">
          <ImageLayer
            assetId="doorLower"
            wrapperClassName="layout-offset--door-lower"
            imageClassName="door-panel door-panel--lower layout-editable"
            src={ASSETS.doorLower}
            getOffsetStyle={getOffsetStyle}
            getScaleStyle={getScaleStyle}
            setLayoutNode={setLayoutNode}
            beginMove={beginMove}
          />
        </div>
        <ImageLayer
          assetId="latch"
          wrapperClassName="layout-offset--latch"
          imageClassName="bay-layer bay-latch layout-editable"
          src={ASSETS.bayLatch}
          getOffsetStyle={getOffsetStyle}
          getScaleStyle={getScaleStyle}
          setLayoutNode={setLayoutNode}
          beginMove={beginMove}
        />
      </div>
    </DeviceLayer>
  );
}

function DeviceButton({
  assetId,
  wrapperClassName,
  className,
  label,
  imgSrc,
  disabled,
  getOffsetStyle,
  getScaleStyle,
  setLayoutNode,
  onPointerDown,
  onClick,
}: {
  assetId: Extract<
    LayoutAssetId,
    'buttonMenu' | 'buttonArchive' | 'buttonBack'
  >;
  wrapperClassName: string;
  className: string;
  label: string;
  imgSrc: string;
  disabled: boolean;
  getOffsetStyle: (assetId: LayoutAssetId) => LayoutCssProperties;
  getScaleStyle: (assetId: LayoutAssetId) => LayoutCssProperties;
  setLayoutNode: (assetId: LayoutAssetId, node: HTMLElement | null) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onClick: () => void;
}) {
  return (
    <DeviceLayer
      assetId={assetId}
      className={wrapperClassName}
      getOffsetStyle={getOffsetStyle}
    >
      <button
        ref={(node) => setLayoutNode(assetId, node)}
        className={`device-button ${className} layout-editable`}
        style={getScaleStyle(assetId)}
        data-layout-id={assetId}
        type="button"
        onClick={onClick}
        onPointerDown={onPointerDown}
        disabled={disabled}
        aria-label={label}
      >
        <img src={imgSrc} alt="" draggable="false" />
      </button>
    </DeviceLayer>
  );
}

function getRegistryTitle(screen: ScreenId): string {
  if (screen === 'corvids') {
    return 'CORVID RECORDS';
  }

  if (screen === 'bullfrogs') {
    return 'BULLFROG RECORDS';
  }

  if (screen === 'wombats' || screen === 'dossier') {
    return 'WOMBAT RECORDS';
  }

  if (screen === 'nutrias') {
    return 'NUTRIA RECORDS';
  }

  if (screen === 'platypus') {
    return 'PLATYPUS RECORDS';
  }

  return 'SPECIES RECORDS';
}

function getRegistryRecordName(dossier: Dossier): string {
  const normalizedName = dossier.name
    .replace(/^WOMBAT SPECIMEN\s*/i, 'Wombat Specimen ')
    .replace(/^PLATYPUS SPECIMEN\s*/i, 'Platypus Specimen ')
    .replace(/^THE\s+/i, 'The ');

  return normalizedName
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getDispensedIconSrc(dossierId: string | null | undefined): string {
  if (!dossierId) {
    return ASSETS.recordIcon;
  }

  if (dossierId.startsWith('CRVD-')) {
    return ASSETS.corvidDispensedIcon;
  }

  if (dossierId.startsWith('BFRG-')) {
    return ASSETS.bullfrogDispensedIcon;
  }

  if (dossierId.startsWith('WMBT-')) {
    return ASSETS.wombatDispensedIcon;
  }

  if (dossierId.startsWith('NTRI-')) {
    return ASSETS.nutriaDispensedIcon;
  }

  if (dossierId.startsWith('PLTY-')) {
    return ASSETS.platypusDispensedIcon;
  }

  const artifactIcon = ARTIFACTS_DATABASE.find(
    (entry) => entry.dossierId === dossierId,
  )?.icon;

  return artifactIcon ?? ASSETS.recordIcon;
}

function getDossierRegistryScreen(dossierId: string): ScreenId {
  if (dossierId.startsWith('CRVD-')) {
    return 'corvids';
  }

  if (dossierId.startsWith('BFRG-')) {
    return 'bullfrogs';
  }

  if (dossierId.startsWith('NTRI-')) {
    return 'nutrias';
  }

  if (dossierId.startsWith('PLTY-')) {
    return 'platypus';
  }

  if (dossierId.startsWith('ARTF-')) {
    return 'objects';
  }

  return 'wombats';
}

function getDossierSheetSrc(dossierId?: string | null): string | null {
  switch (dossierId) {
    case 'WMBT-001':
      return ASSETS.dossierTheUnit;
    case 'WMBT-007':
      return ASSETS.dossierChiefExecutiveWombat;
    case 'WMBT-017':
      return ASSETS.dossierBaronVonStank;
    case 'WMBT-018':
      return ASSETS.dossierSepticPhilosopher;
    case 'ARTF-022':
      return ASSETS.dossierCharlesArtifact;
    default:
      return null;
  }
}

function getRegistryDossiers(screen: ScreenId, fallbackDossiers: Dossier[]) {
  if (screen === 'corvids') {
    return CORVID_DOSSIERS;
  }

  if (screen === 'bullfrogs') {
    return BULLFROG_DOSSIERS;
  }

  if (screen === 'nutrias') {
    return NUTRIA_DOSSIERS;
  }

  if (screen === 'platypus') {
    return [PLATYPUS_DOSSIER];
  }

  return fallbackDossiers;
}

function DossierBrowser({
  screen,
  dossiers,
  selectedDossierId,
  selectedDossier,
  deliveryPhase,
  getOffsetStyle,
  getScaleStyle,
  setLayoutNode,
  beginMove,
  onEnterArchive,
  onSelectSpecies,
  onSelectObjects,
  onSelectEvents,
  onSelectAnomalies,
  onOpenSpeciesRegistry,
  onOpenDossier,
  onDeliverDossier,
}: {
  screen: ScreenId;
  dossiers: Dossier[];
  selectedDossierId: string | null;
  selectedDossier: Dossier | null;
  deliveryPhase: DeliveryPhase | null;
  getOffsetStyle: (assetId: LayoutAssetId) => LayoutCssProperties;
  getScaleStyle: (assetId: LayoutAssetId) => LayoutCssProperties;
  setLayoutNode: (assetId: LayoutAssetId, node: HTMLElement | null) => void;
  beginMove: (
    event: ReactPointerEvent<HTMLElement>,
    assetId: LayoutAssetId,
  ) => void;
  onEnterArchive: () => void;
  onSelectSpecies: () => void;
  onSelectObjects: () => void;
  onSelectEvents: () => void;
  onSelectAnomalies: () => void;
  onOpenSpeciesRegistry: (screen: ScreenId) => void;
  onOpenDossier: (id: string) => void;
  onDeliverDossier: (
    id: string,
    returnScreen: ScreenId,
    showDossierScreen?: boolean,
  ) => void;
}) {
  if (deliveryPhase) {
    return (
      <AssetRetrievalScreen
        phase={deliveryPhase}
        assetName={selectedDossier?.name ?? 'SELECTED ASSET'}
        dispensedIconSrc={getDispensedIconSrc(selectedDossier?.id)}
      />
    );
  }

  if (screen === 'home') {
    return (
      <div className="crt-browser crt-main-menu">
        <div className="crt-main-menu__title">D.A.R.S. Interface</div>
        <div className="crt-main-menu__subtitle">Archive Access Terminal</div>
        <div className="crt-main-menu__divider" aria-hidden="true">
          <span />
        </div>
        <div className="crt-main-menu__copy">
          <span>Authorized Operator Entry</span>
          <span>Touch To Enter Archive</span>
        </div>
        <button
          type="button"
          className="crt-main-menu__button"
          onClick={onEnterArchive}
        >
          Enter
          <span aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (screen === 'menu') {
    return (
      <div className="crt-browser">
        <CrtEditableBlock
          assetId="crtTitleLine"
          className="crt-title-line"
          getOffsetStyle={getOffsetStyle}
          getScaleStyle={getScaleStyle}
          setLayoutNode={setLayoutNode}
          beginMove={beginMove}
        >
          <span
            className="crt-title-chevrons crt-title-chevrons--left"
            aria-hidden="true"
          >
            <i />
            <i />
          </span>
          <strong>SELECT CATEGORY</strong>
          <span
            className="crt-title-chevrons crt-title-chevrons--right"
            aria-hidden="true"
          >
            <i />
            <i />
          </span>
        </CrtEditableBlock>

        <CategoryBadge
          assetId="catSpecies"
          className="cat-badge cat-badge--species"
          src={ASSETS.speciesBadge}
          label="Species"
          onClick={onSelectSpecies}
          getOffsetStyle={getOffsetStyle}
          getScaleStyle={getScaleStyle}
          setLayoutNode={setLayoutNode}
          beginMove={beginMove}
        />
        <CategoryBadge
          assetId="catArtifacts"
          className="cat-badge cat-badge--artifacts"
          src={ASSETS.artifactBadge}
          label="Artifacts"
          onClick={onSelectObjects}
          getOffsetStyle={getOffsetStyle}
          getScaleStyle={getScaleStyle}
          setLayoutNode={setLayoutNode}
          beginMove={beginMove}
        />
        <CategoryBadge
          assetId="catEvents"
          className="cat-badge cat-badge--events"
          src={ASSETS.eventBadge}
          label="Events"
          onClick={onSelectEvents}
          getOffsetStyle={getOffsetStyle}
          getScaleStyle={getScaleStyle}
          setLayoutNode={setLayoutNode}
          beginMove={beginMove}
        />
        <CategoryBadge
          assetId="catAnomalies"
          className="cat-badge cat-badge--anomalies"
          src={ASSETS.anomalyBadge}
          label="Anomalies"
          onClick={onSelectAnomalies}
          getOffsetStyle={getOffsetStyle}
          getScaleStyle={getScaleStyle}
          setLayoutNode={setLayoutNode}
          beginMove={beginMove}
        />
      </div>
    );
  }

  if (screen === 'species') {
    return (
      <CategoryDatabase
        category="SPECIES"
        entries={SPECIES_DATABASE}
        selectedDossierId={selectedDossierId}
        onSelectEntry={(entry) => {
          if (entry.target) {
            onOpenSpeciesRegistry(entry.target);
            return;
          }

          if (entry.dossierId) {
            onDeliverDossier(entry.dossierId, 'species');
          }
        }}
      />
    );
  }

  if (screen === 'objects') {
    return (
      <CategoryDatabase
        category="ARTIFACT"
        entries={ARTIFACTS_DATABASE}
        selectedDossierId={selectedDossierId}
        showRecordCount={false}
        onSelectEntry={(entry) => {
          if (entry.dossierId) {
            onDeliverDossier(entry.dossierId, 'objects', false);
          }
        }}
      />
    );
  }

  if (screen === 'events' || screen === 'anomalies') {
    return <RestrictedScreen />;
  }

  return (
    <SpeciesRegistryScreen
      screen={screen}
      dossiers={getRegistryDossiers(screen, dossiers)}
      selectedDossierId={selectedDossierId}
      onOpenDossier={onOpenDossier}
    />
  );
}

function SpeciesRegistryScreen({
  screen,
  dossiers,
  selectedDossierId,
  onOpenDossier,
}: {
  screen: ScreenId;
  dossiers: Dossier[];
  selectedDossierId: string | null;
  onOpenDossier: (id: string) => void;
}) {
  return (
    <div className="crt-browser crt-database crt-record-browser">
      <div className="crt-db-title">
        <span
          className="crt-title-chevrons crt-title-chevrons--left"
          aria-hidden="true"
        >
          <i />
          <i />
        </span>
        <strong>{getRegistryTitle(screen)}</strong>
        <span
          className="crt-title-chevrons crt-title-chevrons--right"
          aria-hidden="true"
        >
          <i />
          <i />
        </span>
      </div>

      <div className="crt-db-head crt-record-browser__head">
        <span />
        <span>ID</span>
        <span>DESIGNATION</span>
      </div>

      <div className="crt-db-list crt-record-browser__list">
        {dossiers.map((dossier) => {
          const isSelected = dossier.id === selectedDossierId;

          return (
            <button
              key={dossier.id}
              type="button"
              className={`crt-db-row${isSelected ? ' is-selected' : ''}`}
              onClick={() => onOpenDossier(dossier.id)}
            >
              <span className="crt-db-row__icon" aria-hidden="true">
                <img
                  className="crt-db-row__species-icon crt-record-browser__icon"
                  src={ASSETS.recordIcon}
                  alt=""
                  draggable="false"
                />
              </span>
              <span className="crt-record-browser__copy">
                <strong>
                  {isSelected ? '>' : ''}
                  {dossier.id}
                </strong>
                <span>{getRegistryRecordName(dossier)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RestrictedScreen() {
  return (
    <div className="crt-browser crt-restricted-screen">
      <div className="crt-restricted-message">RESTRICTED</div>
    </div>
  );
}

function AssetRetrievalScreen({
  phase,
  assetName,
  dispensedIconSrc,
}: {
  phase: DeliveryPhase;
  assetName: string;
  dispensedIconSrc: string;
}) {
  if (phase === 'retrieved') {
    return (
      <div className="crt-browser crt-asset-status crt-asset-status--dispensed">
        <img
          className="crt-asset-status__icon crt-asset-status__icon--dispensed"
          src={dispensedIconSrc}
          alt=""
          aria-hidden="true"
          draggable="false"
        />
        <strong>DOSSIER DISPENSED</strong>
        <span>Please Remove From Bay</span>
      </div>
    );
  }

  return (
    <div className="crt-browser crt-asset-status">
      <div className="crt-asset-status__panel">
        <strong>ACCESS GRANTED</strong>
        <em>Retrieving Record</em>
        <span>{assetName}</span>
        <div className="crt-asset-status__bar" aria-hidden="true">
          {Array.from({ length: 16 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CrtEditableBlock({
  assetId,
  className,
  getOffsetStyle,
  getScaleStyle,
  setLayoutNode,
  beginMove,
  children,
}: {
  assetId: Extract<
    LayoutAssetId,
    'crtTitleLine' | 'crtLeftPanel' | 'crtRightTopPanel' | 'crtRightBottomPanel'
  >;
  className: string;
  getOffsetStyle: (assetId: LayoutAssetId) => LayoutCssProperties;
  getScaleStyle: (assetId: LayoutAssetId) => LayoutCssProperties;
  setLayoutNode: (assetId: LayoutAssetId, node: HTMLElement | null) => void;
  beginMove: (
    event: ReactPointerEvent<HTMLElement>,
    assetId: LayoutAssetId,
  ) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`crt-layout-offset crt-layout-offset--${assetId}`}
      style={getOffsetStyle(assetId)}
    >
      <div
        ref={(node) => setLayoutNode(assetId, node)}
        className={`${className} layout-editable`}
        style={getScaleStyle(assetId)}
        data-layout-id={assetId}
        onPointerDown={(event) => beginMove(event, assetId)}
      >
        {children}
      </div>
    </div>
  );
}

function CategoryBadge({
  assetId,
  className,
  src,
  label,
  onClick,
  getOffsetStyle,
  getScaleStyle,
  setLayoutNode,
  beginMove,
}: {
  assetId: Extract<
    LayoutAssetId,
    'catSpecies' | 'catArtifacts' | 'catEvents' | 'catAnomalies'
  >;
  className: string;
  src: string;
  label: string;
  onClick: () => void;
  getOffsetStyle: (assetId: LayoutAssetId) => LayoutCssProperties;
  getScaleStyle: (assetId: LayoutAssetId) => LayoutCssProperties;
  setLayoutNode: (assetId: LayoutAssetId, node: HTMLElement | null) => void;
  beginMove: (
    event: ReactPointerEvent<HTMLElement>,
    assetId: LayoutAssetId,
  ) => void;
}) {
  return (
    <div
      className={`crt-layout-offset crt-layout-offset--${assetId}`}
      style={getOffsetStyle(assetId)}
    >
      <button
        ref={(node) => setLayoutNode(assetId, node)}
        className={`${className} layout-editable`}
        style={getScaleStyle(assetId)}
        data-layout-id={assetId}
        type="button"
        onClick={onClick}
        onPointerDown={(event) => beginMove(event, assetId)}
        aria-label={label}
      >
        <img
          className="cat-badge__content"
          src={src}
          alt=""
          draggable="false"
        />
        <img
          className="cat-badge__frame"
          src={ASSETS.categoryHexFrame}
          alt=""
          aria-hidden="true"
          draggable="false"
        />
      </button>
    </div>
  );
}

function pad3(value: number): string {
  return String(value).padStart(3, '0');
}

function CategoryDatabase({
  category,
  entries,
  selectedDossierId,
  showRecordCount = true,
  onSelectEntry,
}: {
  category: string;
  entries: CategoryEntry[];
  selectedDossierId?: string | null;
  showRecordCount?: boolean;
  onSelectEntry: (entry: CategoryEntry) => void;
}) {
  return (
    <div
      className={`crt-browser crt-database${
        showRecordCount ? '' : ' crt-database--no-count'
      }`}
    >
      <div className="crt-db-title">
        <span
          className="crt-title-chevrons crt-title-chevrons--left"
          aria-hidden="true"
        >
          <i />
          <i />
        </span>
        <strong>{category} DATABASE</strong>
        <span
          className="crt-title-chevrons crt-title-chevrons--right"
          aria-hidden="true"
        >
          <i />
          <i />
        </span>
      </div>

      <div className="crt-db-head">
        <span />
        <span>ID</span>
        <span>{category}</span>
        <span>{showRecordCount ? 'RECORD COUNT' : ''}</span>
        <span />
      </div>

      <div className="crt-db-list">
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`crt-db-row${
              entry.locked ? ' crt-db-row--locked' : ''
            }${entry.dossierId === selectedDossierId ? ' is-selected' : ''}`}
            onClick={() => onSelectEntry(entry)}
            disabled={entry.locked}
          >
            <span className="crt-db-row__icon" aria-hidden="true">
              {entry.locked ? (
                <svg className="crt-db-lock" viewBox="0 0 24 24">
                  <rect
                    x="5"
                    y="11"
                    width="14"
                    height="9"
                    rx="1.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M8 11 V7.5 a4 4 0 0 1 8 0 V11"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              ) : entry.icon ? (
                <img
                  className="crt-db-row__species-icon"
                  src={entry.icon}
                  alt=""
                  draggable="false"
                />
              ) : null}
            </span>
            <span className="crt-db-row__id">{entry.id}</span>
            <span className="crt-db-row__name">{entry.name}</span>
            <span className="crt-db-row__count">
              {showRecordCount
                ? entry.locked
                  ? 'REDACTED'
                  : pad3(entry.count)
                : ''}
            </span>
            <span className="crt-db-row__arrow" aria-hidden="true">
              &gt;
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BootScreen({
  phase,
  progress,
}: {
  phase: BootPhase;
  progress: number;
}) {
  if (phase === 'flicker') {
    return null;
  }

  if (phase === 'display' || phase === 'granted') {
    const isGranted = phase === 'granted';

    return (
      <div
        className={`crt-boot crt-boot--display${
          isGranted ? ' crt-boot--granted' : ''
        }`}
      >
        <span className="crt-boot__display-text">
          {isGranted ? 'ACCESS GRANTED' : 'DISPLAY INITIALIZING'}
        </span>
      </div>
    );
  }

  return (
    <div className="crt-boot crt-boot--loading">
      <div className="crt-boot__title">INITIALIZING D.A.R.S.</div>

      <div className="crt-boot__tasks">
        {BOOT_TASKS.map((task) => {
          const span = Math.max(0.0001, task.end - task.start);
          const fill = Math.min(
            1,
            Math.max(0, (progress - task.start) / span),
          );
          const isDone = fill >= 1;
          const isActive = fill > 0 && !isDone;

          return (
            <div className="crt-boot__task" key={task.label}>
              <div className="crt-boot__task-line">
                <span>&gt; {task.label}</span>
                <span className="crt-boot__task-status">
                  {isDone
                    ? '[ OK ]'
                    : isActive
                      ? `[ ${Math.round(fill * 100)}% ]`
                      : '.....'}
                </span>
              </div>
              <div className="crt-boot__bar">
                <span
                  className="crt-boot__bar-fill"
                  style={{ width: `${fill * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="crt-boot__footer">
        <div className="crt-boot__status-box">
          STATUS: AUTHENTICATION IN PROGRESS
        </div>

        <div className="crt-boot__standby">PLEASE STAND BY</div>

        <div className="crt-boot__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

export default App;

