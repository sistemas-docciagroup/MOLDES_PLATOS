export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alertas_vistas: {
        Row: {
          created_at: string
          id: string
          numero_molde: string | null
          referencia_id: string
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          numero_molde?: string | null
          referencia_id: string
          tipo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          numero_molde?: string | null
          referencia_id?: string
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      colores_fabricacion: {
        Row: {
          activo: boolean
          color: string
          created_at: string
          id: string
          permite_molde_con_incidencia: boolean
          tipo_color: Database["public"]["Enums"]["tipo_color"]
        }
        Insert: {
          activo?: boolean
          color: string
          created_at?: string
          id?: string
          permite_molde_con_incidencia?: boolean
          tipo_color?: Database["public"]["Enums"]["tipo_color"]
        }
        Update: {
          activo?: boolean
          color?: string
          created_at?: string
          id?: string
          permite_molde_con_incidencia?: boolean
          tipo_color?: Database["public"]["Enums"]["tipo_color"]
        }
        Relationships: []
      }
      contador_piezas_molde: {
        Row: {
          fecha_ultima_reparacion: string | null
          numero_molde: string
          piezas_desde_ultima_reparacion: number
          piezas_totales: number
          total_reparaciones: number
          updated_at: string
        }
        Insert: {
          fecha_ultima_reparacion?: string | null
          numero_molde: string
          piezas_desde_ultima_reparacion?: number
          piezas_totales?: number
          total_reparaciones?: number
          updated_at?: string
        }
        Update: {
          fecha_ultima_reparacion?: string | null
          numero_molde?: string
          piezas_desde_ultima_reparacion?: number
          piezas_totales?: number
          total_reparaciones?: number
          updated_at?: string
        }
        Relationships: []
      }
      defectos_predefinidos: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          orden: number
          tipo: Database["public"]["Enums"]["tipo_defecto"]
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          tipo: Database["public"]["Enums"]["tipo_defecto"]
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          tipo?: Database["public"]["Enums"]["tipo_defecto"]
          updated_at?: string
        }
        Relationships: []
      }
      estado_actual_molde: {
        Row: {
          decidido_por_basicos_id: string | null
          decidido_por_basicos_nombre: string | null
          decidido_por_delicados_id: string | null
          decidido_por_delicados_nombre: string | null
          decidido_por_nombre: string | null
          decidido_por_usuario_id: string | null
          estado_actual: Database["public"]["Enums"]["estado_oficial_molde"]
          estado_basicos: Database["public"]["Enums"]["estado_canal_color"]
          estado_delicados: Database["public"]["Enums"]["estado_canal_color"]
          fecha_decision: string | null
          fecha_estado_basicos: string | null
          fecha_estado_delicados: string | null
          id: string
          incidencia_activa_id: string | null
          motivo_basicos: string | null
          motivo_delicados: string | null
          numero_molde: string
          puede_fabricar: boolean
          recomendacion_actual: string | null
          restriccion_color: string | null
          updated_at: string
        }
        Insert: {
          decidido_por_basicos_id?: string | null
          decidido_por_basicos_nombre?: string | null
          decidido_por_delicados_id?: string | null
          decidido_por_delicados_nombre?: string | null
          decidido_por_nombre?: string | null
          decidido_por_usuario_id?: string | null
          estado_actual?: Database["public"]["Enums"]["estado_oficial_molde"]
          estado_basicos?: Database["public"]["Enums"]["estado_canal_color"]
          estado_delicados?: Database["public"]["Enums"]["estado_canal_color"]
          fecha_decision?: string | null
          fecha_estado_basicos?: string | null
          fecha_estado_delicados?: string | null
          id?: string
          incidencia_activa_id?: string | null
          motivo_basicos?: string | null
          motivo_delicados?: string | null
          numero_molde: string
          puede_fabricar?: boolean
          recomendacion_actual?: string | null
          restriccion_color?: string | null
          updated_at?: string
        }
        Update: {
          decidido_por_basicos_id?: string | null
          decidido_por_basicos_nombre?: string | null
          decidido_por_delicados_id?: string | null
          decidido_por_delicados_nombre?: string | null
          decidido_por_nombre?: string | null
          decidido_por_usuario_id?: string | null
          estado_actual?: Database["public"]["Enums"]["estado_oficial_molde"]
          estado_basicos?: Database["public"]["Enums"]["estado_canal_color"]
          estado_delicados?: Database["public"]["Enums"]["estado_canal_color"]
          fecha_decision?: string | null
          fecha_estado_basicos?: string | null
          fecha_estado_delicados?: string | null
          id?: string
          incidencia_activa_id?: string | null
          motivo_basicos?: string | null
          motivo_delicados?: string | null
          numero_molde?: string
          puede_fabricar?: boolean
          recomendacion_actual?: string | null
          restriccion_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fabricaciones_of: {
        Row: {
          color: string | null
          created_at: string
          eliminada: boolean
          eliminada_at: string | null
          eliminada_por: string | null
          eliminada_por_nombre: string | null
          fecha_hora: string
          id: string
          incidencia_id: string | null
          medida: string | null
          modelo: string | null
          motivo_eliminacion: string | null
          numero_molde: string
          numero_of: string
          observacion: string | null
          puesto: Database["public"]["Enums"]["puesto_trabajo"] | null
          reparacion_id: string | null
          resultado: Database["public"]["Enums"]["fabricacion_resultado"]
          texto_incidencia: string | null
          usuario_id: string
          usuario_nombre: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          eliminada?: boolean
          eliminada_at?: string | null
          eliminada_por?: string | null
          eliminada_por_nombre?: string | null
          fecha_hora?: string
          id?: string
          incidencia_id?: string | null
          medida?: string | null
          modelo?: string | null
          motivo_eliminacion?: string | null
          numero_molde: string
          numero_of: string
          observacion?: string | null
          puesto?: Database["public"]["Enums"]["puesto_trabajo"] | null
          reparacion_id?: string | null
          resultado: Database["public"]["Enums"]["fabricacion_resultado"]
          texto_incidencia?: string | null
          usuario_id: string
          usuario_nombre: string
        }
        Update: {
          color?: string | null
          created_at?: string
          eliminada?: boolean
          eliminada_at?: string | null
          eliminada_por?: string | null
          eliminada_por_nombre?: string | null
          fecha_hora?: string
          id?: string
          incidencia_id?: string | null
          medida?: string | null
          modelo?: string | null
          motivo_eliminacion?: string | null
          numero_molde?: string
          numero_of?: string
          observacion?: string | null
          puesto?: Database["public"]["Enums"]["puesto_trabajo"] | null
          reparacion_id?: string | null
          resultado?: Database["public"]["Enums"]["fabricacion_resultado"]
          texto_incidencia?: string | null
          usuario_id?: string
          usuario_nombre?: string
        }
        Relationships: []
      }
      historial_cambios_of: {
        Row: {
          created_at: string
          fabricacion_of_id: string
          fecha_hora: string
          id: string
          molde_anterior: string | null
          molde_nuevo: string
          motivo_cambio: string
          numero_of: string
          puesto: Database["public"]["Enums"]["puesto_trabajo"] | null
          usuario_id: string
          usuario_nombre: string
        }
        Insert: {
          created_at?: string
          fabricacion_of_id: string
          fecha_hora?: string
          id?: string
          molde_anterior?: string | null
          molde_nuevo: string
          motivo_cambio: string
          numero_of: string
          puesto?: Database["public"]["Enums"]["puesto_trabajo"] | null
          usuario_id: string
          usuario_nombre: string
        }
        Update: {
          created_at?: string
          fabricacion_of_id?: string
          fecha_hora?: string
          id?: string
          molde_anterior?: string | null
          molde_nuevo?: string
          motivo_cambio?: string
          numero_of?: string
          puesto?: Database["public"]["Enums"]["puesto_trabajo"] | null
          usuario_id?: string
          usuario_nombre?: string
        }
        Relationships: []
      }
      historial_estado_molde: {
        Row: {
          created_at: string
          estado_anterior: Database["public"]["Enums"]["estado_molde"] | null
          estado_nuevo: Database["public"]["Enums"]["estado_molde"]
          id: string
          molde: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          estado_anterior?: Database["public"]["Enums"]["estado_molde"] | null
          estado_nuevo: Database["public"]["Enums"]["estado_molde"]
          id?: string
          molde: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          estado_anterior?: Database["public"]["Enums"]["estado_molde"] | null
          estado_nuevo?: Database["public"]["Enums"]["estado_molde"]
          id?: string
          molde?: string
          user_id?: string | null
        }
        Relationships: []
      }
      incidencias: {
        Row: {
          color: string | null
          created_at: string
          descripcion: string
          estado: Database["public"]["Enums"]["incidencia_estado"]
          estado_molde: Database["public"]["Enums"]["estado_molde"]
          foto_nombre: string | null
          foto_subida_at: string | null
          foto_url: string | null
          gravedad: Database["public"]["Enums"]["gravedad"]
          id: string
          molde: string | null
          motivo_corto: string | null
          puesto: Database["public"]["Enums"]["puesto_trabajo"] | null
          tipo_fallo: string | null
          transcripcion: string
          updated_at: string
          user_id: string | null
          zona: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          descripcion: string
          estado?: Database["public"]["Enums"]["incidencia_estado"]
          estado_molde?: Database["public"]["Enums"]["estado_molde"]
          foto_nombre?: string | null
          foto_subida_at?: string | null
          foto_url?: string | null
          gravedad?: Database["public"]["Enums"]["gravedad"]
          id?: string
          molde?: string | null
          motivo_corto?: string | null
          puesto?: Database["public"]["Enums"]["puesto_trabajo"] | null
          tipo_fallo?: string | null
          transcripcion: string
          updated_at?: string
          user_id?: string | null
          zona?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          descripcion?: string
          estado?: Database["public"]["Enums"]["incidencia_estado"]
          estado_molde?: Database["public"]["Enums"]["estado_molde"]
          foto_nombre?: string | null
          foto_subida_at?: string | null
          foto_url?: string | null
          gravedad?: Database["public"]["Enums"]["gravedad"]
          id?: string
          molde?: string | null
          motivo_corto?: string | null
          puesto?: Database["public"]["Enums"]["puesto_trabajo"] | null
          tipo_fallo?: string | null
          transcripcion?: string
          updated_at?: string
          user_id?: string | null
          zona?: string | null
        }
        Relationships: []
      }
      incidencias_producto: {
        Row: {
          created_at: string
          defectos: string[]
          descripcion: string
          foto_nombre: string | null
          foto_url: string | null
          id: string
          molde: string | null
          motivo_corto: string | null
          origen: string
          pedido: string | null
          puesto: Database["public"]["Enums"]["puesto_trabajo"] | null
          transcripcion: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          defectos?: string[]
          descripcion: string
          foto_nombre?: string | null
          foto_url?: string | null
          id?: string
          molde?: string | null
          motivo_corto?: string | null
          origen?: string
          pedido?: string | null
          puesto?: Database["public"]["Enums"]["puesto_trabajo"] | null
          transcripcion?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          defectos?: string[]
          descripcion?: string
          foto_nombre?: string | null
          foto_url?: string | null
          id?: string
          molde?: string | null
          motivo_corto?: string | null
          origen?: string
          pedido?: string | null
          puesto?: Database["public"]["Enums"]["puesto_trabajo"] | null
          transcripcion?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      molde_modelos: {
        Row: {
          created_at: string
          id: string
          modelo: string
          numero_molde: string
        }
        Insert: {
          created_at?: string
          id?: string
          modelo: string
          numero_molde: string
        }
        Update: {
          created_at?: string
          id?: string
          modelo?: string
          numero_molde?: string
        }
        Relationships: []
      }
      moldes_maestro: {
        Row: {
          activo: boolean
          codigo_rfid_futuro: string | null
          created_at: string
          id: string
          medida: string | null
          modelo: string | null
          notas: string | null
          numero_molde: string
        }
        Insert: {
          activo?: boolean
          codigo_rfid_futuro?: string | null
          created_at?: string
          id?: string
          medida?: string | null
          modelo?: string | null
          notas?: string | null
          numero_molde: string
        }
        Update: {
          activo?: boolean
          codigo_rfid_futuro?: string | null
          created_at?: string
          id?: string
          medida?: string | null
          modelo?: string | null
          notas?: string | null
          numero_molde?: string
        }
        Relationships: []
      }
      of_molde_asignado: {
        Row: {
          asignado_por_id: string | null
          asignado_por_nombre: string | null
          color: string | null
          created_at: string
          medida: string | null
          modelo: string | null
          numero_molde: string
          numero_of: string
          puesto: Database["public"]["Enums"]["puesto_trabajo"] | null
          updated_at: string
        }
        Insert: {
          asignado_por_id?: string | null
          asignado_por_nombre?: string | null
          color?: string | null
          created_at?: string
          medida?: string | null
          modelo?: string | null
          numero_molde: string
          numero_of: string
          puesto?: Database["public"]["Enums"]["puesto_trabajo"] | null
          updated_at?: string
        }
        Update: {
          asignado_por_id?: string | null
          asignado_por_nombre?: string | null
          color?: string | null
          created_at?: string
          medida?: string | null
          modelo?: string | null
          numero_molde?: string
          numero_of?: string
          puesto?: Database["public"]["Enums"]["puesto_trabajo"] | null
          updated_at?: string
        }
        Relationships: []
      }
      permisos_puesto_botones: {
        Row: {
          button_id: string
          button_name: string
          categoria: string
          created_at: string
          id: string
          scope: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          button_id: string
          button_name: string
          categoria: string
          created_at?: string
          id?: string
          scope: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          button_id?: string
          button_name?: string
          categoria?: string
          created_at?: string
          id?: string
          scope?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      picadas_of: {
        Row: {
          color: string | null
          created_at: string
          estado_molde_en_momento:
            | Database["public"]["Enums"]["estado_oficial_molde"]
            | null
          fecha_hora: string
          id: string
          incidencia_id: string | null
          medida: string | null
          modelo: string | null
          numero_molde: string
          numero_of: string
          puede_fabricar: boolean | null
          puesto: Database["public"]["Enums"]["puesto_trabajo"] | null
          recomendacion_id: string | null
          resultado: Database["public"]["Enums"]["picada_resultado"]
          tenia_incidencia_activa: boolean | null
          usuario_id: string
          usuario_nombre: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          estado_molde_en_momento?:
            | Database["public"]["Enums"]["estado_oficial_molde"]
            | null
          fecha_hora?: string
          id?: string
          incidencia_id?: string | null
          medida?: string | null
          modelo?: string | null
          numero_molde: string
          numero_of: string
          puede_fabricar?: boolean | null
          puesto?: Database["public"]["Enums"]["puesto_trabajo"] | null
          recomendacion_id?: string | null
          resultado: Database["public"]["Enums"]["picada_resultado"]
          tenia_incidencia_activa?: boolean | null
          usuario_id: string
          usuario_nombre: string
        }
        Update: {
          color?: string | null
          created_at?: string
          estado_molde_en_momento?:
            | Database["public"]["Enums"]["estado_oficial_molde"]
            | null
          fecha_hora?: string
          id?: string
          incidencia_id?: string | null
          medida?: string | null
          modelo?: string | null
          numero_molde?: string
          numero_of?: string
          puede_fabricar?: boolean | null
          puesto?: Database["public"]["Enums"]["puesto_trabajo"] | null
          recomendacion_id?: string | null
          resultado?: Database["public"]["Enums"]["picada_resultado"]
          tenia_incidencia_activa?: boolean | null
          usuario_id?: string
          usuario_nombre?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activo: boolean
          created_at: string
          email: string
          flujo_picar: string
          id: string
          nombre: string
          puede_crear_incidencias: boolean
          puede_ver_historial: boolean
          puede_ver_moldes: boolean
          puesto: Database["public"]["Enums"]["puesto_trabajo"] | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email: string
          flujo_picar?: string
          id: string
          nombre: string
          puede_crear_incidencias?: boolean
          puede_ver_historial?: boolean
          puede_ver_moldes?: boolean
          puesto?: Database["public"]["Enums"]["puesto_trabajo"] | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string
          flujo_picar?: string
          id?: string
          nombre?: string
          puede_crear_incidencias?: boolean
          puede_ver_historial?: boolean
          puede_ver_moldes?: boolean
          puesto?: Database["public"]["Enums"]["puesto_trabajo"] | null
          updated_at?: string
        }
        Relationships: []
      }
      recomendaciones_bloqueo: {
        Row: {
          canal: Database["public"]["Enums"]["recomendacion_bloqueo_canal"]
          created_at: string
          estado: Database["public"]["Enums"]["recomendacion_bloqueo_estado"]
          fecha_revision: string | null
          foto_url: string | null
          id: string
          motivo: string
          motivo_revision: string | null
          numero_molde: string
          puesto: Database["public"]["Enums"]["puesto_trabajo"] | null
          revisada_por: string | null
          revisada_por_nombre: string | null
          transcripcion: string | null
          updated_at: string
          usuario_id: string
          usuario_nombre: string
        }
        Insert: {
          canal: Database["public"]["Enums"]["recomendacion_bloqueo_canal"]
          created_at?: string
          estado?: Database["public"]["Enums"]["recomendacion_bloqueo_estado"]
          fecha_revision?: string | null
          foto_url?: string | null
          id?: string
          motivo: string
          motivo_revision?: string | null
          numero_molde: string
          puesto?: Database["public"]["Enums"]["puesto_trabajo"] | null
          revisada_por?: string | null
          revisada_por_nombre?: string | null
          transcripcion?: string | null
          updated_at?: string
          usuario_id: string
          usuario_nombre: string
        }
        Update: {
          canal?: Database["public"]["Enums"]["recomendacion_bloqueo_canal"]
          created_at?: string
          estado?: Database["public"]["Enums"]["recomendacion_bloqueo_estado"]
          fecha_revision?: string | null
          foto_url?: string | null
          id?: string
          motivo?: string
          motivo_revision?: string | null
          numero_molde?: string
          puesto?: Database["public"]["Enums"]["puesto_trabajo"] | null
          revisada_por?: string | null
          revisada_por_nombre?: string | null
          transcripcion?: string | null
          updated_at?: string
          usuario_id?: string
          usuario_nombre?: string
        }
        Relationships: []
      }
      recomendaciones_molde: {
        Row: {
          fecha_hora: string
          fecha_revision: string | null
          foto_url: string | null
          id: string
          incidencia_relacionada_id: string | null
          numero_molde: string
          puesto: Database["public"]["Enums"]["puesto_trabajo"] | null
          recomendacion: string
          revisada: boolean
          revisada_por: string | null
          texto_original: string | null
          usuario_id: string
          usuario_nombre: string
        }
        Insert: {
          fecha_hora?: string
          fecha_revision?: string | null
          foto_url?: string | null
          id?: string
          incidencia_relacionada_id?: string | null
          numero_molde: string
          puesto?: Database["public"]["Enums"]["puesto_trabajo"] | null
          recomendacion: string
          revisada?: boolean
          revisada_por?: string | null
          texto_original?: string | null
          usuario_id: string
          usuario_nombre: string
        }
        Update: {
          fecha_hora?: string
          fecha_revision?: string | null
          foto_url?: string | null
          id?: string
          incidencia_relacionada_id?: string | null
          numero_molde?: string
          puesto?: Database["public"]["Enums"]["puesto_trabajo"] | null
          recomendacion?: string
          revisada?: boolean
          revisada_por?: string | null
          texto_original?: string | null
          usuario_id?: string
          usuario_nombre?: string
        }
        Relationships: []
      }
      reparaciones: {
        Row: {
          descripcion: string
          descripcion_reparacion: string | null
          estado: Database["public"]["Enums"]["reparacion_estado"]
          fecha_cierre: string | null
          fecha_envio: string
          foto_nombre: string | null
          foto_nombre_2: string | null
          foto_url: string | null
          foto_url_2: string | null
          gravedad: Database["public"]["Enums"]["gravedad"]
          id: string
          molde: string
          motivo_corto: string | null
          numero_of: string | null
          puesto: Database["public"]["Enums"]["puesto_trabajo"]
          transcripcion: string | null
          updated_at: string
          user_id: string | null
          usuario_repara: string | null
        }
        Insert: {
          descripcion: string
          descripcion_reparacion?: string | null
          estado?: Database["public"]["Enums"]["reparacion_estado"]
          fecha_cierre?: string | null
          fecha_envio?: string
          foto_nombre?: string | null
          foto_nombre_2?: string | null
          foto_url?: string | null
          foto_url_2?: string | null
          gravedad?: Database["public"]["Enums"]["gravedad"]
          id?: string
          molde: string
          motivo_corto?: string | null
          numero_of?: string | null
          puesto?: Database["public"]["Enums"]["puesto_trabajo"]
          transcripcion?: string | null
          updated_at?: string
          user_id?: string | null
          usuario_repara?: string | null
        }
        Update: {
          descripcion?: string
          descripcion_reparacion?: string | null
          estado?: Database["public"]["Enums"]["reparacion_estado"]
          fecha_cierre?: string | null
          fecha_envio?: string
          foto_nombre?: string | null
          foto_nombre_2?: string | null
          foto_url?: string | null
          foto_url_2?: string | null
          gravedad?: Database["public"]["Enums"]["gravedad"]
          id?: string
          molde?: string
          motivo_corto?: string | null
          numero_of?: string | null
          puesto?: Database["public"]["Enums"]["puesto_trabajo"]
          transcripcion?: string | null
          updated_at?: string
          user_id?: string | null
          usuario_repara?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      moldes_estado_actual: {
        Row: {
          descripcion: string | null
          dias: number | null
          estado_molde: Database["public"]["Enums"]["estado_molde"] | null
          fecha: string | null
          foto_url: string | null
          molde: string | null
          motivo_corto: string | null
          puesto: Database["public"]["Enums"]["puesto_trabajo"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "operario" | "encargado" | "administrador"
      estado_canal_color: "ok" | "observacion" | "bloqueado"
      estado_molde: "seguir_produccion" | "observacion" | "mandar_reparacion"
      estado_oficial_molde:
        | "ok"
        | "seguir_produccion"
        | "observacion"
        | "mandar_reparacion"
        | "en_reparacion"
        | "reparado"
        | "descartado"
      fabricacion_resultado:
        | "fabricacion_ok"
        | "fabricacion_con_incidencia"
        | "fabricacion_con_observacion"
        | "enviado_reparacion"
      gravedad: "baja" | "media" | "alta"
      incidencia_estado: "pendiente" | "reparado" | "descartado"
      picada_resultado:
        | "fabricacion_autorizada"
        | "fabricacion_con_aviso"
        | "fabricacion_bloqueada"
        | "incidencia_registrada"
        | "recomendacion_registrada"
        | "enviado_reparacion"
      puesto_trabajo:
        | "preparacion_molde"
        | "desmoldeo"
        | "repaso"
        | "valvula"
        | "empaquetado"
        | "reparacion_moldes"
      recomendacion_bloqueo_canal: "basicos" | "delicados" | "ambos"
      recomendacion_bloqueo_estado: "pendiente" | "aceptada" | "rechazada"
      reparacion_estado: "en_reparacion" | "reparado" | "descartado"
      tipo_color: "basico" | "delicado"
      tipo_defecto: "producto" | "molde"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["operario", "encargado", "administrador"],
      estado_canal_color: ["ok", "observacion", "bloqueado"],
      estado_molde: ["seguir_produccion", "observacion", "mandar_reparacion"],
      estado_oficial_molde: [
        "ok",
        "seguir_produccion",
        "observacion",
        "mandar_reparacion",
        "en_reparacion",
        "reparado",
        "descartado",
      ],
      fabricacion_resultado: [
        "fabricacion_ok",
        "fabricacion_con_incidencia",
        "fabricacion_con_observacion",
        "enviado_reparacion",
      ],
      gravedad: ["baja", "media", "alta"],
      incidencia_estado: ["pendiente", "reparado", "descartado"],
      picada_resultado: [
        "fabricacion_autorizada",
        "fabricacion_con_aviso",
        "fabricacion_bloqueada",
        "incidencia_registrada",
        "recomendacion_registrada",
        "enviado_reparacion",
      ],
      puesto_trabajo: [
        "preparacion_molde",
        "desmoldeo",
        "repaso",
        "valvula",
        "empaquetado",
        "reparacion_moldes",
      ],
      recomendacion_bloqueo_canal: ["basicos", "delicados", "ambos"],
      recomendacion_bloqueo_estado: ["pendiente", "aceptada", "rechazada"],
      reparacion_estado: ["en_reparacion", "reparado", "descartado"],
      tipo_color: ["basico", "delicado"],
      tipo_defecto: ["producto", "molde"],
    },
  },
} as const
