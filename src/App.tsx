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
  | 'wombats'
  | 'dossier';

type BootPhase = 'flicker' | 'display' | 'loading' | 'granted' | 'ready';

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
    name: 'THE GENTLEMAN',
    status: 'CONTAINED',
    classification: 'TIER III',
    date: '1987-04-12',
    summary:
      'Subject manifests only during periods of formal civic ceremony. Physical contact with subject results in compulsive politeness lasting 72 hours.',
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

const DOSSIERS: Dossier[] = Array.from({ length: 13 }, (_, index) => {
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
});

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

  categoryHexFrame: `${ASSET_ROOT}/category_hex_frame.png`,
  speciesBadge: `${ASSET_ROOT}/category_species_icon.png`,
  artifactBadge: `${ASSET_ROOT}/category_artifact_icon.png`,
  eventBadge: `${ASSET_ROOT}/category_event_icon.png`,
  anomalyBadge: `${ASSET_ROOT}/category_anomalies_icon.png`,
} as const;

const SPECIES_DATABASE: CategoryEntry[] = [
  { id: '01', name: 'CORVIDS', count: 13, icon: ASSETS.speciesCorvidIcon },
  { id: '02', name: 'BULLFROGS', count: 9, icon: ASSETS.speciesBullfrogIcon },
  {
    id: '03',
    name: 'WOMBATS',
    count: 17,
    icon: ASSETS.speciesWombatIcon,
    target: 'wombats',
  },
  {
    id: '04',
    name: 'NUTRIAS (GROSS)',
    count: 8,
    icon: ASSETS.speciesNutriaIcon,
  },
  {
    id: '05',
    name: 'PLATYPUS',
    count: 1,
    icon: ASSETS.speciesPlatypusIcon,
    dossierId: 'PLTY-001',
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
];

const PLATYPUS_DOSSIER: Dossier = {
  id: 'PLTY-001',
  name: 'PLATYPUS SPECIMEN 001',
  status: 'INDEXED',
  classification: 'TIER I',
  date: '1992-07-18',
  summary:
    'Single-entry species record. Subject displays improbable composure and refuses all conventional taxonomy jokes.',
};

const ALL_DOSSIERS: Dossier[] = [
  ...DOSSIERS,
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
];

const STATUS_LABELS: Record<BayState, string> = {
  closed: 'CLOSED',
  unlocking: 'UNLOCKING',
  opening: 'OPENING',
  open: 'OPEN',
  closing: 'CLOSING',
  locking: 'LOCKING',
};

const UNLOCK_DURATION_MS = 380;
const DOOR_DURATION_MS = 600;
const LOCK_DURATION_MS = 380;
const BOOT_FLICKER_DURATION_MS = 1150;
const BOOT_DISPLAY_DURATION_MS = 1400;
const BOOT_LOADING_DURATION_MS = 2800;
const BOOT_GRANTED_DURATION_MS = 1000;
const LAYOUT_STORAGE_KEY = 'dars-1a-layout-adjustments-v2';
const PROTECTED_LAYOUT_ASSET_IDS = [
  'buttonMenu',
  'buttonArchive',
  'buttonBack',
] as const satisfies readonly LayoutAssetId[];

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
  crt: { x: 0.384, y: 0.31, scale: 1, width: 1, height: 0.83 },
  deviceHeader: { x: 0, y: 1.442, scale: 1, width: 1.01, height: 1 },
  warningBanner: { x: 0.77, y: 4.539, scale: 1, width: 1.1, height: 1 },
  crtTitleLine: { x: 0, y: -9.042, scale: 1, width: 0.96, height: 1.24 },
  crtLeftPanel: { x: -3.042, y: 7.157, scale: 1.183, width: 1, height: 1 },
  crtRightTopPanel: { x: 3.347, y: 9.543, scale: 1.167, width: 1, height: 1.38 },
  crtRightBottomPanel: { x: 3.345, y: 12.61, scale: 1, width: 1.16, height: 1 },
  catSpecies: { x: -5.234, y: 8.212, scale: 1.21, width: 1, height: 1.15 },
  catArtifacts: { x: 3.651, y: 8.623, scale: 1.19, width: 0.99, height: 1.22 },
  catEvents: { x: -4.869, y: 17.799, scale: 1.15, width: 1.01, height: 1.18 },
  catAnomalies: { x: 3.954, y: 17.31, scale: 1.15, width: 1.01, height: 1.16 },
  rearBay: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  bayCavity: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  bayRailLeft: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  bayRailRight: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  bayShadow: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  bayFrame: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  shell: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  folder: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  frontBay: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  doorUpper: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  doorLower: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  latch: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  shellOuterMask: { x: 0, y: 0, scale: 1, width: 1, height: 1 },
  buttonMenu: { x: -1.923, y: 2.888, scale: 1.44, width: 0.97, height: 1.09 },
  buttonArchive: { x: 6.537, y: 3.609, scale: 1.732, width: 1.03, height: 1.14 },
  buttonBack: { x: 8.46, y: 3.3, scale: 1.849, width: 1.02, height: 1 },
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
  const [editMode, setEditMode] = useState(false);
  const [selectedAssetId, setSelectedAssetId] =
    useState<LayoutAssetId>('buttonArchive');
  const [layout, setLayout] = useState<LayoutState>(loadSavedLayout);
  const [selectionRect, setSelectionRect] =
    useState<SelectionRect | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [screen, setScreen] = useState<ScreenId>('home');
  const [bootPhase, setBootPhase] = useState<BootPhase>('flicker');
  const [bootProgress, setBootProgress] = useState(0);
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(
    null,
  );
  const [dossierReturnScreen, setDossierReturnScreen] =
    useState<ScreenId>('wombats');
  const [operatorMessage, setOperatorMessage] = useState<string | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<ScreenId | null>(
    null,
  );

  const deviceRef = useRef<HTMLElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const layoutNodesRef = useRef(new Map<LayoutAssetId, HTMLElement>());
  const pointerOperationRef = useRef<PointerOperation | null>(null);

  const isBusy =
    bayState === 'unlocking' ||
    bayState === 'opening' ||
    bayState === 'closing' ||
    bayState === 'locking';

  const selectedAdjustment = layout[selectedAssetId];
  const selectedDossier =
    ALL_DOSSIERS.find((dossier) => dossier.id === selectedDossierId) ?? null;
  const isProtectedLayoutAsset = PROTECTED_LAYOUT_ASSET_IDS.includes(
    selectedAssetId as (typeof PROTECTED_LAYOUT_ASSET_IDS)[number],
  );

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

  const openBay = useCallback(() => {
    if (editMode || bayState !== 'closed') {
      return;
    }

    clearTimers();
    setBayState('unlocking');
    schedule(() => setBayState('opening'), UNLOCK_DURATION_MS);
    schedule(
      () => setBayState('open'),
      UNLOCK_DURATION_MS + DOOR_DURATION_MS,
    );
  }, [bayState, clearTimers, editMode, schedule]);

  const closeBay = useCallback(() => {
    if (editMode || bayState !== 'open') {
      return;
    }

    clearTimers();
    setBayState('closing');
    schedule(() => setBayState('locking'), DOOR_DURATION_MS);
    schedule(() => setBayState('closed'), DOOR_DURATION_MS + LOCK_DURATION_MS);
  }, [bayState, clearTimers, editMode, schedule]);

  const handleArchive = useCallback(() => {
    if (editMode || isBusy) {
      return;
    }

    if (bayState === 'closed') {
      if (!selectedDossier) {
        setOperatorMessage('SELECT A DOSSIER');
        return;
      }

      setOperatorMessage(null);
      setScreen('dossier');
      openBay();
      return;
    }

    if (bayState === 'open') {
      setOperatorMessage(null);
      closeBay();
    }
  }, [bayState, closeBay, editMode, isBusy, openBay, selectedDossier]);

  const handleMenu = useCallback(() => {
    if (editMode || isBusy || pendingNavigation) {
      return;
    }

    setOperatorMessage(null);

    if (bayState === 'open') {
      setPendingNavigation('home');
      closeBay();
      return;
    }

    setScreen('home');
  }, [bayState, closeBay, editMode, isBusy, pendingNavigation]);

  const openDossier = useCallback((id: string) => {
    if (isBusy) {
      return;
    }

    setOperatorMessage(null);
    setDossierReturnScreen('wombats');
    setSelectedDossierId(id);
    setScreen('dossier');
  }, [isBusy]);

  const deliverDossier = useCallback(
    (id: string, returnScreen: ScreenId) => {
      if (editMode || isBusy || pendingNavigation) {
        return;
      }

      if (!ALL_DOSSIERS.some((dossier) => dossier.id === id)) {
        setOperatorMessage('DOSSIER NOT FOUND');
        return;
      }

      setOperatorMessage(null);
      setDossierReturnScreen(returnScreen);
      setSelectedDossierId(id);
      setScreen('dossier');

      if (bayState === 'closed') {
        openBay();
      }
    },
    [bayState, editMode, isBusy, openBay, pendingNavigation],
  );

  const navigateToScreen = useCallback(
    (nextScreen: ScreenId) => {
      if (editMode || isBusy || pendingNavigation) {
        return;
      }

      setOperatorMessage(null);
      setScreen(nextScreen);
    },
    [editMode, isBusy, pendingNavigation],
  );

  const getBackDestination = useCallback((currentScreen: ScreenId): ScreenId => {
    if (currentScreen === 'dossier') {
      return dossierReturnScreen;
    }

    if (currentScreen === 'wombats') {
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
    if (editMode || isBusy || pendingNavigation) {
      return;
    }

    setOperatorMessage(null);

    if (bayState === 'open') {
      setPendingNavigation(getBackDestination(screen));
      closeBay();
      return;
    }

    setScreen((currentScreen) => getBackDestination(currentScreen));
  }, [
    bayState,
    closeBay,
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
      setCopyStatus('');
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

  const toggleEditMode = useCallback(() => {
    clearTimers();
    pointerOperationRef.current = null;
    setBayState('closed');
    setCopyStatus('');
    setEditMode((currentEditMode) => !currentEditMode);
  }, [clearTimers]);

  const resetSelectedAsset = useCallback(() => {
    if (PROTECTED_LAYOUT_ASSET_IDS.includes(
      selectedAssetId as (typeof PROTECTED_LAYOUT_ASSET_IDS)[number],
    )) {
      setCopyStatus('Locked production geometry cannot be reset.');
      return;
    }

    updateAsset(selectedAssetId, {
      x: 0,
      y: 0,
      scale: 1,
      width: 1,
      height: 1,
    });
    setCopyStatus('');
  }, [selectedAssetId, updateAsset]);

  const resetAllAssets = useCallback(() => {
    const nextLayout = createDefaultLayout();
    nextLayout.buttonMenu = layout.buttonMenu;
    nextLayout.buttonArchive = layout.buttonArchive;
    nextLayout.buttonBack = layout.buttonBack;
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(nextLayout));
    setLayout(nextLayout);
    setCopyStatus('');
  }, [layout]);

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

  const copyLayoutJson = useCallback(async () => {
    const layoutJson = JSON.stringify(layout, null, 2);

    try {
      await navigator.clipboard.writeText(layoutJson);
      setCopyStatus('Layout copied.');
    } catch {
      setCopyStatus(layoutJson);
    }
  }, [layout]);

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

    setScreen(pendingNavigation);
    setPendingNavigation(null);
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
      <header className="engineering-header">
        <div className="archive-header-unit">
          <div className="archive-status-strip">
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

          <div className="archive-plaque archive-plaque--header">
            <div className="archive-seal" aria-hidden="true">
              <span />
            </div>

            <div className="archive-plaque__title">
              <span>DIRECTORATE ARCHIVE</span>
              <span>RETRIEVAL SYSTEM</span>
            </div>

            <div className="archive-plaque__tag">DARS-1A</div>
          </div>
        </div>

        <div>
          <p className="engineering-kicker">DARS-1A ENGINEERING TEST</p>
          <h1>Retrieval Bay Prototype</h1>
        </div>

        <div className="engineering-controls">
          <div
            className={`state-indicator state-indicator--${bayState}`}
            role="status"
            aria-live="polite"
          >
            {editMode ? 'EDITING' : STATUS_LABELS[bayState]}
          </div>

          <button
            className="control-button control-button--secondary"
            type="button"
            onClick={toggleEditMode}
            aria-pressed={editMode}
          >
            {editMode ? 'Exit Layout' : 'Edit Layout'}
          </button>

          <button
            className="control-button"
            type="button"
            onClick={handleArchive}
            disabled={isBusy || editMode}
          >
            {bayState === 'open' ? 'Close Bay' : 'Open Bay'}
          </button>
        </div>
      </header>

      {editMode && (
        <aside className="layout-editor" aria-label="Layout editor">
          <div className="layout-editor__heading">
            <div>
              <p>LAYOUT CALIBRATION</p>
              <strong>
                {
                  LAYOUT_ASSETS.find(({ id }) => id === selectedAssetId)
                    ?.label
                }
              </strong>
            </div>
            <span>AUTO-SAVED</span>
          </div>

          <label className="layout-field layout-field--wide">
            <span>Asset</span>
            <select
              value={selectedAssetId}
              onChange={(event) => {
                setSelectedAssetId(event.target.value as LayoutAssetId);
                setCopyStatus('');
              }}
            >
              {LAYOUT_ASSETS.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <div className="layout-editor__values">
            <label className="layout-field">
              <span>X %</span>
              <input
                type="number"
                step="0.1"
                value={selectedAdjustment.x}
                onChange={(event) => {
                  updateAsset(selectedAssetId, {
                    x: Number(event.target.value) || 0,
                  });
                }}
              />
            </label>

            <label className="layout-field">
              <span>Y %</span>
              <input
                type="number"
                step="0.1"
                value={selectedAdjustment.y}
                onChange={(event) => {
                  updateAsset(selectedAssetId, {
                    y: Number(event.target.value) || 0,
                  });
                }}
              />
            </label>

            <label className="layout-field">
              <span>Scale</span>
              <input
                type="number"
                min="0.1"
                max="5"
                step="0.01"
                value={selectedAdjustment.scale}
                onChange={(event) => {
                  updateAsset(selectedAssetId, {
                    scale: Math.min(
                      5,
                      Math.max(0.1, Number(event.target.value) || 1),
                    ),
                  });
                }}
              />
            </label>

            <label className="layout-field">
              <span>Width</span>
              <input
                type="number"
                min="0.1"
                max="5"
                step="0.01"
                value={selectedAdjustment.width}
                onChange={(event) => {
                  updateAsset(selectedAssetId, {
                    width: Math.min(
                      5,
                      Math.max(0.1, Number(event.target.value) || 1),
                    ),
                  });
                }}
              />
            </label>

            <label className="layout-field">
              <span>Height</span>
              <input
                type="number"
                min="0.1"
                max="5"
                step="0.01"
                value={selectedAdjustment.height}
                onChange={(event) => {
                  updateAsset(selectedAssetId, {
                    height: Math.min(
                      5,
                      Math.max(0.1, Number(event.target.value) || 1),
                    ),
                  });
                }}
              />
            </label>
          </div>

          <div className="layout-nudge" aria-label="Nudge selected asset">
            <button type="button" onClick={() => nudgeSelectedAsset(0, -1)}>
              Up
            </button>
            <button type="button" onClick={() => nudgeSelectedAsset(-1, 0)}>
              Left
            </button>
            <button type="button" onClick={() => nudgeSelectedAsset(1, 0)}>
              Right
            </button>
            <button type="button" onClick={() => nudgeSelectedAsset(0, 1)}>
              Down
            </button>
          </div>

          <div className="layout-editor__actions">
            <button type="button" onClick={resetSelectedAsset}>
              {isProtectedLayoutAsset ? 'Selected Locked' : 'Reset Selected'}
            </button>
            <button type="button" onClick={resetAllAssets}>
              Reset All
            </button>
            <button type="button" onClick={copyLayoutJson}>
              Copy Layout JSON
            </button>
          </div>

          <p className="layout-editor__help">
            Drag an asset to move it. Drag the square handle to resize.
            Arrow keys nudge one pixel; Shift + Arrow nudges ten.
          </p>

          {copyStatus && (
            <p className="layout-editor__status" role="status">
              {copyStatus}
            </p>
          )}
        </aside>
      )}

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
                    operatorMessage={operatorMessage}
                    getOffsetStyle={getOffsetStyle}
                    getScaleStyle={getScaleStyle}
                    setLayoutNode={setLayoutNode}
                    beginMove={beginMove}
                    onEnterArchive={() => navigateToScreen('menu')}
                    onSelectSpecies={() => navigateToScreen('species')}
                    onSelectObjects={() => navigateToScreen('objects')}
                    onSelectEvents={() => navigateToScreen('events')}
                    onSelectAnomalies={() => navigateToScreen('anomalies')}
                    onOpenWombats={() => navigateToScreen('wombats')}
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

          <DeviceButton
            assetId="buttonMenu"
            wrapperClassName="layout-offset--button-menu"
            className="device-button--menu"
            label="Menu"
            imgSrc={ASSETS.buttonMenu}
            disabled={!editMode && isBusy}
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
            className="device-button--archive"
            label={
              editMode
                ? 'Archive button layout asset'
                : bayState === 'open'
                  ? 'Close archive retrieval bay'
                  : 'Open archive retrieval bay'
            }
            imgSrc={ASSETS.buttonArchive}
            disabled={!editMode && isBusy}
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
            disabled={!editMode && isBusy}
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

function getCrtTitle(screen: ScreenId): string {
  if (screen === 'home') {
    return 'DARS Interface';
  }

  if (screen === 'species') {
    return 'Select Species Type';
  }

  if (screen === 'objects') {
    return 'Artifacts Database';
  }

  if (screen === 'events') {
    return 'Select Events Type';
  }

  if (screen === 'anomalies') {
    return 'Select Anomalies Type';
  }

  if (screen === 'wombats' || screen === 'dossier') {
    return 'Wombat Records';
  }

  return 'Select Dossier Type';
}

function DossierBrowser({
  screen,
  dossiers,
  selectedDossierId,
  selectedDossier,
  operatorMessage,
  getOffsetStyle,
  getScaleStyle,
  setLayoutNode,
  beginMove,
  onEnterArchive,
  onSelectSpecies,
  onSelectObjects,
  onSelectEvents,
  onSelectAnomalies,
  onOpenWombats,
  onOpenDossier,
  onDeliverDossier,
}: {
  screen: ScreenId;
  dossiers: Dossier[];
  selectedDossierId: string | null;
  selectedDossier: Dossier | null;
  operatorMessage: string | null;
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
  onOpenWombats: () => void;
  onOpenDossier: (id: string) => void;
  onDeliverDossier: (id: string, returnScreen: ScreenId) => void;
}) {
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
        onSelectEntry={(entry) => {
          if (entry.target === 'wombats') {
            onOpenWombats();
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
        onSelectEntry={(entry) => {
          if (entry.dossierId) {
            onDeliverDossier(entry.dossierId, 'objects');
          }
        }}
      />
    );
  }

  if (screen === 'events' || screen === 'anomalies') {
    return <RestrictedScreen />;
  }

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
        <span className="crt-title-chevrons crt-title-chevrons--left" aria-hidden="true">
          <i />
          <i />
        </span>
        <strong>{operatorMessage ?? getCrtTitle(screen)}</strong>
        <span className="crt-title-chevrons crt-title-chevrons--right" aria-hidden="true">
          <i />
          <i />
        </span>
      </CrtEditableBlock>

      <CrtEditableBlock
        assetId="crtLeftPanel"
        className="crt-panel crt-panel--left"
        getOffsetStyle={getOffsetStyle}
        getScaleStyle={getScaleStyle}
        setLayoutNode={setLayoutNode}
        beginMove={beginMove}
      >
        {(screen === 'wombats' || screen === 'dossier') ? (
          <div className="crt-panel-actions crt-panel-actions--records">
            {dossiers.map((dossier) => (
              <button
                key={dossier.id}
                type="button"
                className={
                  dossier.id === selectedDossierId ? 'is-selected' : undefined
                }
                onClick={() => onOpenDossier(dossier.id)}
              >
                <img
                  className="crt-btn-icon"
                  src={ASSETS.recordIcon}
                  alt=""
                  aria-hidden="true"
                  draggable="false"
                />
                {dossier.id}
              </button>
            ))}
          </div>
        ) : null}
      </CrtEditableBlock>

      <CrtEditableBlock
        assetId="crtRightTopPanel"
        className="crt-panel crt-panel--right-top"
        getOffsetStyle={getOffsetStyle}
        getScaleStyle={getScaleStyle}
        setLayoutNode={setLayoutNode}
        beginMove={beginMove}
      >
        <div className="crt-panel-list">
          {screen === 'wombats' || screen === 'dossier'
            ? dossiers.slice(0, 6).map((dossier) => (
                <span key={dossier.id}>{dossier.id}</span>
              ))
            : null}
        </div>
      </CrtEditableBlock>

      <CrtEditableBlock
        assetId="crtRightBottomPanel"
        className="crt-panel crt-panel--right-bottom"
        getOffsetStyle={getOffsetStyle}
        getScaleStyle={getScaleStyle}
        setLayoutNode={setLayoutNode}
        beginMove={beginMove}
      >
        {selectedDossier ? (
          <div className="crt-panel-record">
            <strong>{selectedDossier.id}</strong>
            <span>{selectedDossier.name}</span>
            <span>{selectedDossier.classification}</span>
          </div>
        ) : (
          <div className="crt-panel-message">
            {operatorMessage ?? 'NO RECORD SELECTED'}
          </div>
        )}
      </CrtEditableBlock>
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
  onSelectEntry,
}: {
  category: string;
  entries: CategoryEntry[];
  onSelectEntry: (entry: CategoryEntry) => void;
}) {
  const totalRecords = entries.reduce(
    (sum, entry) => (entry.locked ? sum : sum + entry.count),
    0,
  );

  return (
    <div className="crt-browser crt-database">
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
        <span>ID</span>
        <span>{category} CATEGORY</span>
        <span>TOTAL RECORDS: {pad3(totalRecords)}</span>
      </div>

      <div className="crt-db-list">
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`crt-db-row${entry.locked ? ' crt-db-row--locked' : ''}`}
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
              {entry.locked ? 'REDACTED' : pad3(entry.count)}
            </span>
            <span className="crt-db-row__arrow" aria-hidden="true">
              ›
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
