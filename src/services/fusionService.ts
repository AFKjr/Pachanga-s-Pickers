import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * Service for executing the NFL stats fusion script
 */
export class FusionService {
  /**
   * Execute the fusion script on offense and defense CSV files
   */
  static async fuseStatsFiles(
    offenseFilePath: string,
    defenseFilePath: string,
    outputFilePath: string
  ): Promise<{ success: boolean; outputPath?: string; error?: string }> {
    try {
      // Ensure output directory exists
      const outputDir = path.dirname(outputFilePath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Run the combined fusion script
      const scriptPath = path.join(process.cwd(), 'scripts', 'nfl-stats-fusion.ts');
      const command = `npx tsx "${scriptPath}" "${offenseFilePath}" "${defenseFilePath}" "${outputFilePath}" --combined`;
      console.log(`Running combined fusion command: ${command}`);

      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      if (stderr && !stderr.includes('✅')) {
        console.warn('Fusion script stderr:', stderr);
      }

      console.log('Fusion script stdout:', stdout);

      // Check if output file was created
      if (fs.existsSync(outputFilePath)) {
        return { success: true, outputPath: outputFilePath };
      } else {
        return { success: false, error: 'Fusion script did not create output file' };
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown fusion error';
      console.error('Fusion execution failed:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Execute fusion on uploaded file contents (writes temp files first)
   */
  static async fuseStatsContent(
    offenseContent: string,
    defenseContent: string,
    week: number,
    season: number
  ): Promise<{ success: boolean; fusedContent?: string; error?: string }> {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const offenseTempPath = path.join(tempDir, `offense_w${week}_s${season}.csv`);
    const defenseTempPath = path.join(tempDir, `defense_w${week}_s${season}.csv`);
    const outputTempPath = path.join(tempDir, `fused_w${week}_s${season}.csv`);

    try {
      // Write temp files
      fs.writeFileSync(offenseTempPath, offenseContent, 'utf-8');
      fs.writeFileSync(defenseTempPath, defenseContent, 'utf-8');

      // Run fusion
      const result = await this.fuseStatsFiles(offenseTempPath, defenseTempPath, outputTempPath);

      if (result.success && result.outputPath) {
        const fusedContent = fs.readFileSync(result.outputPath, 'utf-8');
        return { success: true, fusedContent };
      } else {
        return { success: false, error: result.error };
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown fusion error';
      return { success: false, error: errorMsg };
    } finally {
      // Clean up temp files
      try {
        if (fs.existsSync(offenseTempPath)) fs.unlinkSync(offenseTempPath);
        if (fs.existsSync(defenseTempPath)) fs.unlinkSync(defenseTempPath);
        if (fs.existsSync(outputTempPath)) fs.unlinkSync(outputTempPath);
      } catch (cleanupError) {
        console.warn('Failed to clean up temp files:', cleanupError);
      }
    }
  }
}