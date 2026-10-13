// Configuração da instalação. O BioShield AI é um hospital por instalação (sem multi-tenant):
// o nome exibido vem do ambiente, e o backend não recebe nem devolve hospital_id.

export const HOSPITAL = {
  code: import.meta.env.VITE_HOSPITAL_CODE ?? 'EXEMPLO',
  name: import.meta.env.VITE_HOSPITAL_NAME ?? 'Hospital Exemplo',
  short_name: import.meta.env.VITE_HOSPITAL_SHORT_NAME ?? 'Hospital Exemplo',
};

// Modo demonstração: dados fictícios locais, nenhuma credencial é verificada.
// Fica ligado por padrão enquanto o backend não existe; em produção use VITE_DEMO_MODE=false.
export const DEMO_MODE: boolean = import.meta.env.VITE_DEMO_MODE !== 'false';
