import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tractor } from './tractor.entity';
import { Batea } from './batea.entity';

export enum EstadoChofer {
  DISPONIBLE = 'disponible',
  CARGANDO = 'cargando',
  VIAJANDO = 'viajando',
  DESCANSANDO = 'descansando',
  DESCARGANDO = 'descargando',
  ENTREGA_FINALIZADA = 'entrega_finalizada',
  LICENCIA_ANUAL = 'licencia_anual',
  FRANCO = 'franco',
  EQUIPO_EN_REPARACION = 'equipo_en_reparacion',
  INACTIVO = 'inactivo',
}

@Entity('choferes')
export class Chofer {
  @PrimaryGeneratedColumn('increment')
  id_chofer: number;

  @Column()
  nombre_completo: string;

  @Column({ nullable: true })
  tractor_id: number;

  @ManyToOne(() => Tractor, {
    nullable: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'tractor_id' })
  tractor: Tractor;

  @Column({ nullable: true })
  batea_id: number;

  @ManyToOne(() => Batea, {
    nullable: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'batea_id' })
  batea: Batea;

  @Column({
    type: 'enum',
    enum: EstadoChofer,
    default: EstadoChofer.DISPONIBLE,
  })
  estado_chofer: EstadoChofer;

  @Column({ nullable: true })
  razon_estado: string;

  @Column({ type: 'timestamp', nullable: true })
  fecha_inicio_licencia: Date;

  @Column({ type: 'timestamp', nullable: true })
  fecha_fin_licencia: Date;

  @Column({ type: 'timestamp', nullable: true })
  ultimo_inicio_descanso: Date;

  @Column({ type: 'timestamp', nullable: true })
  ultimo_fin_descanso: Date;

  @CreateDateColumn()
  creado_en: Date;

  @UpdateDateColumn()
  ultimo_estado_en: Date;
}

