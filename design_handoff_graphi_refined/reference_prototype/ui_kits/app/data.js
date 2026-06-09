// Graphi UI Kit — sample project data
window.GSampleProjects = [
  { id: 'p1', name: 'Quantum error correction', rootNodeId: 'n1' },
  { id: 'p2', name: 'Essay — attention & focus', rootNodeId: 'm1' },
  { id: 'p3', name: 'Trip planning' },
];

window.GSampleNodes = {
  p1: [
    { id: 'n1', parentId: null, title: 'Quantum error correction' },
    { id: 'n2', parentId: 'n1', title: 'Surface codes' },
    { id: 'n3', parentId: 'n2', title: 'Syndrome extraction' },
    { id: 'n4', parentId: 'n2', title: 'Threshold theorem' },
    { id: 'n5', parentId: 'n1', title: 'Cat qubits' },
    { id: 'n6', parentId: 'n5', title: 'Bias-preserving gates' },
    { id: 'n7', parentId: 'n1', title: 'Decoders' },
    { id: 'n8', parentId: 'n7', title: 'MWPM matching' },
    { id: 'n9', parentId: 'n7', title: 'Neural decoders' },
  ],
};

window.GSampleMessages = {
  n2: [
    { id: 'a', role: 'user', content: 'Give me the intuition for why surface codes are so practical.' },
    { id: 'b', role: 'assistant', content: 'Surface codes lay qubits on a 2D grid and only ever measure neighbours, so every check is local. That locality is what makes them hardware-friendly — and it gives a high error threshold around 1%.' },
    { id: 'c', role: 'user', content: 'And the cost of that practicality?' },
    { id: 'd', role: 'assistant', content: 'Overhead. You spend a lot of physical qubits per logical qubit. Branch a thread off "Threshold theorem" if you want to chase the exact scaling.' },
  ],
  n1: [
    { id: 'e', role: 'user', content: 'What are the main families of quantum error-correcting codes?' },
    { id: 'f', role: 'assistant', content: 'Broadly: stabilizer codes (surface, color), bosonic codes (cat, GKP), and concatenated codes. Each node below explores one branch.' },
  ],
};

// fake streamed reply tokens
window.GFakeReply = "Good question — let me think alongside you. The key tradeoff is between locality and overhead: keep checks local and you gain a robust threshold, but you pay in physical-qubit count. Want me to branch this into its own thread?";
