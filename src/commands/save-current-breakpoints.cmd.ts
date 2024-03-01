import * as vscode from "vscode";
import * as path from "path";
import { writeFile } from "fs/promises";
import { BreakpointBookmarksProvider } from "../providers/breakpoint-bookmarks.provider";

export const saveCurrentBreakpoints =
  (provider: BreakpointBookmarksProvider) => async () => {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri
      ?.fsPath as string;
    const config = vscode.workspace.getConfiguration("breakpointBookmark");
    const saveLocation = config.get("saveLocation") as string;
    await provider.assureSaveDirectoryExist(saveLocation, workspacePath);
    const fileName = await vscode.window.showInputBox({
      title: "Enter file name without extension",
      placeHolder: "test express bug",
    });
    const currentBreakpoints = vscode.debug.breakpoints.map(
      (bp: vscode.Breakpoint) => ((bp as any).functionName?{ // function breakpoint
        functionName: (bp as any).functionName,
        enabled: bp.enabled,
        condition: bp.condition,
        hitCondition: bp.hitCondition,
        logMessage: bp.logMessage,
      }:{ // normal breakpoint
        location: (bp as any).location.uri.path,
        range: (bp as any).location.range,
        enabled: bp.enabled,
        condition: bp.condition,
        hitCondition: bp.hitCondition,
        logMessage: bp.logMessage,
      })
    );

    const filePath = saveLocation
      ? `${saveLocation}/${fileName}.json`
      : path.join(workspacePath, ".vscode", "breakpoints", `${fileName}.json`);

    await writeFile(filePath, JSON.stringify(currentBreakpoints), {
      encoding: "utf-8",
    });
    provider.refresh();
  };
