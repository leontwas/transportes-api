import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tractor } from './tractor.entity';
import { Chofer } from './chofer.entity';

export enum EstadoBatea {
  CARGADO = 'cargado',
  VACIO = 'vacio',
  EN_REPARACION = 'en_reparacion',
}

@Entity('bateas')
export class Batea {
  @PrimaryGeneratedColumn('increment')
  batea_id: number;

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
    enum: EstadoBatea,
    default: EstadoBatea.VACIO,
  })
  estado: EstadoBatea;

  @Column({ nullable: true })
  carga_max_batea: number; // en toneladas

  @Column({ nullable: true })
  chofer_id: number;

  @ManyToOne(() => Chofer, {
    nullable: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'chofer_id' })
  chofer: Chofer;

  @Column({ nullable: true })
  tractor_id: number;

  @ManyToOne(() => Tractor, {
    nullable: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'tractor_id' })
  tractor: Tractor;

  @OneToMany(() => Tractor, (tractor) => tractor.batea)
  tractores: Tractor[];

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  creado_en: Date;

  @UpdateDateColumn()
  actualizado_en: Date;
}
