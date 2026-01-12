import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Batea } from './batea.entity';

export enum EstadoTractor {
  OCUPADO = 'ocupado',
  EN_REPARACION = 'en_reparacion',
  LIBRE = 'libre',
}

@Entity('tractores')
export class Tractor {
  @PrimaryGeneratedColumn('increment')
  tractor_id: number;

  @Column()
  marca: string;

  @Column()
  modelo: string;

  @Column()
  patente: string;

  @Column({ nullable: true })
  seguro: string;

  @Column({
    type: 'enum',
    enum: EstadoTractor,
    default: EstadoTractor.LIBRE,
  })
  estado_tractor: EstadoTractor;

  @Column({ nullable: true })
  carga_max_tractor: number; // en toneladas

  @Column({ nullable: true })
  chofer_id: number;

  @Column({ nullable: true })
  batea_id: number;

  @ManyToOne(() => Batea, (batea) => batea.tractores, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'batea_id' })
  batea: Batea;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  creado_en: Date;

  @UpdateDateColumn()
  actualizado_en: Date;
}
