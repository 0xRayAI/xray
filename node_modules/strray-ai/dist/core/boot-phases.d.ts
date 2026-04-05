/**
 * Boot Phases Configuration
 *
 * Defines the phases and their order for the boot sequence.
 * This file centralizes boot phase definitions for maintainability.
 *
 * @version 1.0.0
 * @since 2026-01-07
 */
export interface BootPhase {
    id: number;
    name: string;
    description: string;
    required: boolean;
}
export declare const BOOT_PHASES: BootPhase[];
export declare function getBootPhase(phaseId: number): BootPhase | undefined;
export declare function getRequiredPhases(): BootPhase[];
//# sourceMappingURL=boot-phases.d.ts.map