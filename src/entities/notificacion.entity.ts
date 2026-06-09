import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

@Entity('notificaciones')
export class Notificacion {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column()
    mensaje: string;

    @Column({ default: false })
    leida: boolean;

    @CreateDateColumn()
    creado_en: Date;
}
