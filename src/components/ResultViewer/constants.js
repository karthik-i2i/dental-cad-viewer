export const STL_FILES = [
  { id: 1, name: "Input Maxilla", path: "/models/1_1.ply" },
  { id: 2, name: "Input Mandible", path: "/models/1_2.ply" },
  { id: 3, name: "Reoriented Maxilla", path: "/models/2_1.stl" },
  { id: 4, name: "Reoriented Mandible", path: "/models/2_2.stl" },
  { id: 5, name: "Clean Maxilla", path: "/models/3_1.stl" },
  { id: 6, name: "Clean Mandible", path: "/models/3_2.stl" },
  { id: 7, name: "Teeth removed Maxilla", path: "/models/4_1.ply" },
  { id: 8, name: "Teeth removed Mandible", path: "/models/4_2.ply" },
  { id: 9, name: "Trimmed Maxilla", path: "/models/5_1.stl" },
  { id: 10, name: "Trimmed Mandible", path: "/models/5_2.stl" },
  { id: 11, name: "Hollow Maxilla", path: "/models/6_1.stl" },
  { id: 12, name: "Hollow Mandible", path: "/models/6_2.stl" },
  { id: 13, name: "Solid Maxilla", path: "/models/7_1.stl" },
  { id: 14, name: "Solid Mandible", path: "/models/7_2.stl" },
  { id: 15, name: "Wall attached", path: "/models/8.stl" },
  { id: 16, name: "Blade attached", path: "/models/9.stl" },
  { id: 17, name: "Prong attached", path: "/models/10.stl" }
];

export const MODEL_GROUPS = [
  {
    title: 'Input',
    ids: [1, 2],
  },
  {
    title: 'Reoriented',
    ids: [3, 4],
  },
  {
    title: 'Clean',
    ids: [5, 6],
  },
  {
    title: 'Teeth Removed',
    ids: [7, 8],
  },
  {
    title: 'Trimmed',
    ids: [9, 10],
  },
  {
    title: 'Hollow',
    ids: [11, 12],
  },
  {
    title: 'Solid',
    ids: [13, 14],
  },
  {
    title: 'Final Assembly',
    ids: [15, 16, 17],
  },
];

export const SHIELD_LABELS = {
  lateral_left:  'Lateral Left',
  lateral_right: 'Lateral Right',
  reduced:       'Reduced Coverage',
  upper:         'Upper Arch Full',
};

export const PROGRESS_STEPS = [
  {
    label: 'Segmenting Mandible (Input)',
    progress: 8,
  },
  {
    label: 'Segmenting Maxilla (Input)',
    progress: 16,
  },
  {
    label: 'Reorienting Scans',
    progress: 21,
  },
  {
    label: 'Segmenting Mandible (Reoriented)',
    progress: 29,
  },
  {
    label: 'Segmenting Maxilla (Reoriented)',
    progress: 37,
  },
  {
    label: 'Preparing Boundary Data',
    progress: 40,
  },
  {
    label: 'Removing Scan Artifacts',
    progress: 45,
  },
  {
    label: 'Removing Teeth',
    progress: 50,
  },
  {
    label: 'Trimming Scan',
    progress: 55,
  },
  {
    label: 'Generating Splint Surface',
    progress: 65,
  },
  {
    label: 'Building Solid Splint',
    progress: 75,
  },
  {
    label: 'Building Wall Segment',
    progress: 85,
  },
  {
    label: 'Placing Tongue Blade',
    progress: 90,
  },
  {
    label: 'Engraving Prong',
    progress: 97,
  },
  {
    label: 'Placing Prong',
    progress: 99,
  },
  {
    label: 'Finalizing Output',
    progress: 100,
  },
];