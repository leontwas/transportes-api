import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Viaje } from './viaje.entity';

@Entity('periodos_descanso')
export class PeriodoDescanso {
    @PrimaryGeneratedColumn('increment')
    id_periodo: number;

    @Column()
    viaje_id: number;

    @ManyToOne(() => Viaje, { createForeignKeyConstraints: false })
    @JoinColumn({ name: 'viaje_id' })
    viaje: Viaje;

    @Column({ type: 'timestamp' })
    inicio_descanso: Date;

    @Column({ type: 'timestamp', nullable: true })
    fin_descanso: Date;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    horas_calculadas: number;

    @CreateDateColumn()
    creado_en: Date;

    @UpdateDateColumn()
    actualizado_en: Date;
}
