export interface Usuario {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  created_at?: string;
}

export interface Chat {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
}

export interface Papel {
  id: string;
  user_id: string;
  nome: string;
  avatar_url: string | null;
  cor_balao: string;
  cor_fonte: string;
  equipado: boolean;
  created_at?: string;
}

export interface Mensagem {
  id: string;
  chat_id: string;
  sender_id: string;
  texto: string;
  created_at: string;
  papel_id: string | null;
  read_at: string | null;
  papel?: Papel | null;
  sender?: Usuario | null;
}

export interface ConfigChat {
  id: string;
  chat_id: string;
  user_id: string;
  background_url: string | null;
  background_opacity: number;
}

export interface PersonagemSalvo {
  id: string;
  user_id: string;
  nome: string;
  dados: {
    papel: {
      nome: string;
      avatar_url: string | null;
      cor_balao: string;
      cor_fonte: string;
      descricao?: string;
    };
    referencias: { imagem_url: string; nome?: string; descricao?: string }[];
    vestuario: { imagem_url: string; nome?: string; descricao?: string }[];
    skills: { nome: string; descricao?: string }[];
    avatar_base64?: string;
    ref_images_base64?: string[];
    vest_images_base64?: string[];
  };
  created_at?: string;
}
