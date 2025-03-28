import { writeFile } from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { BreakpointBookmarksProvider } from "../providers/breakpoint-bookmarks.provider";

export const saveCurrentBreakpoints =
  (provider: BreakpointBookmarksProvider) => async () => {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri
      ?.fsPath as string;

    if (!workspacePath) {
      vscode.window.showInformationMessage("No workspace opened!");
      return;
    }
    const config = vscode.workspace.getConfiguration("breakpointBookmark");
    const saveLocation = config.get("saveLocation") as string;
    const useRelativePaths = config.get("useRelativePaths") as boolean;

    const isDirExist = await provider.assureSaveDirectoryExist(
      saveLocation,
      workspacePath
    );
    if (!isDirExist) return;

    const fileName =
      (await vscode.window.showInputBox({
        title: "Enter file name without extension",
        placeHolder: "test express bug",
      })) ?? "";

    const currentBreakpoints = (
      vscode.debug.breakpoints.map(
        (bp: vscode.Breakpoint) => {
          if ((bp as any).functionName) { // for function breakpoint
            return {
              functionName: (bp as any).functionName,
              enabled: bp.enabled,
              condition: bp.condition,
              hitCondition: bp.hitCondition,
              logMessage: bp.logMessage,
            };
          } else { // for normal breakpoint
            let locationPath: string = (bp as any).location.uri.path;

            if (useRelativePaths) {
              locationPath = path.relative(workspacePath, locationPath);
            }

            const range: vscode.Range = (bp as any).location.range.with({
              start: (bp as any).location.range.start.translate(1),
              end: (bp as any).location.range.end.translate(1),
            });
  
            return {
              location: locationPath,
              range,
              enabled: bp.enabled,
              condition: bp.condition,
              hitCondition: bp.hitCondition,
              logMessage: bp.logMessage,
            };
          }
        }
      )
    );

    const filePath = saveLocation
      ? `${path.join(workspacePath, saveLocation, fileName)}.json`
      : path.join(workspacePath, ".vscode", "breakpoints", `${fileName}.json`);

    await writeFile(filePath, JSON.stringify(currentBreakpoints), {
      encoding: "utf-8",
    });

    provider.refresh();
  };
