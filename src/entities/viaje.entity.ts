import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Chofer } from './chofer.entity';
import { Tractor } from './tractor.entity';
import { Batea } from './batea.entity';

export enum EstadoViaje {
    EN_CURSO = 'en_curso',
    CARGANDO = 'cargando',
    VIAJANDO = 'viajando',
    DESCANSANDO = 'descansando',
    DESCARGANDO = 'descargando',
    FINALIZADO = 'finalizado',
    EN_RECLAMO = 'en_reclamo',
}

@Entity('viajes')
export class Viaje {
    @PrimaryGeneratedColumn('increment')
    id_viaje: number;

    @Column()
    origen: string;

    @Column()
    destino: string;

    @Column()
    fecha_salida: Date;

    @Column({ nullable: true })
    fecha_descarga: Date;

    @Column({
        type: 'enum',
        enum: EstadoViaje,
        default: EstadoViaje.EN_CURSO,
    })
    estado_viaje: EstadoViaje;

    @Column({ nullable: true })
    numero_remito: string;

    @Column({ type: 'float', nullable: true })
    toneladas_cargadas: number;

    @Column({ type: 'float', nullable: true })
    toneladas_descargadas: number;

    // Campo acumulativo de todas las horas de descanso
    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    horas_descansadas: number;

    @Column()
    chofer_id: number;

    @ManyToOne(() => Chofer, { createForeignKeyConstraints: false })
    @JoinColumn({ name: 'chofer_id' })
    chofer: Chofer;

    @Column()
    tractor_id: number;

    @ManyToOne(() => Tractor, { createForeignKeyConstraints: false })
    @JoinColumn({ name: 'tractor_id' })
    tractor: Tractor;

    @Column()
    batea_id: number;

    @ManyToOne(() => Batea, { createForeignKeyConstraints: false })
    @JoinColumn({ name: 'batea_id' })
    batea: Batea;

    @CreateDateColumn()
    creado_en: Date;

    @UpdateDateColumn()
    actualizado_en: Date;
}
