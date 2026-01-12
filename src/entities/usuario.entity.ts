import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    BeforeInsert,
    BeforeUpdate,
    OneToOne,
    JoinColumn,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Chofer } from './chofer.entity';

export enum RolUsuario {
    ADMIN = 'admin',
    CHOFER = 'chofer',
}

@Entity('usuarios')
export class Usuario {
    @PrimaryGeneratedColumn('increment')
    usuario_id: number;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @Column()
    nombre: string;

    @Column({
        type: 'enum',
        enum: RolUsuario,
        default: RolUsuario.ADMIN,
    })
    rol: RolUsuario;

    @Column({ default: true })
    activo: boolean;

    @Column({ type: 'timestamp', nullable: true })
    ultimo_login: Date;

    @Column({ nullable: true })
    chofer_id: number;

    @OneToOne(() => Chofer, { createForeignKeyConstraints: false })
    @JoinColumn({ name: 'chofer_id' })
    chofer: Chofer;

    @CreateDateColumn()
    creado_en: Date;

    @UpdateDateColumn()
    actualizado_en: Date;

    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword() {
        if (this.password && !this.password.startsWith('$2b$')) {
            this.password = await bcrypt.hash(this.password, 10);
        }
    }

    async validatePassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.password);
    }
}
