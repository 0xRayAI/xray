/**
 * Storyteller CLI Command
 *
 * Invokes the storyteller skill to write reflections, sagas, journeys, or narratives.
 * Automatically determines story type based on context if not specified.
 *
 * Usage:
 *   npx strray-ai storyteller reflection
 *   npx strray-ai storyteller saga "v1.18.0 Release Journey"
 *   npx strray-ai storyteller journey --title "API Migration"
 *   npx strray-ai storyteller narrative --framework hero_journey
 */
export declare function storytellerCommand(storyType?: string, options?: {
    title?: string;
    framework?: string;
    output?: string;
    dryRun?: boolean;
}): Promise<void>;
export default storytellerCommand;
//# sourceMappingURL=storyteller.d.ts.map