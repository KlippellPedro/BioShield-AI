// Configuração da instalação. O BioShield AI é um hospital por instalação (sem multi-tenant):
// o nome exibido vem do ambiente e o backend não recebe nem devolve hospital_id.
// Se a variável não estiver definida, o nome simplesmente não é exibido.
export const HOSPITAL_NAME: string = (import.meta.env.VITE_HOSPITAL_NAME ?? '').trim();
