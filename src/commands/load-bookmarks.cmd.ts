import * as vscode from "vscode";
import * as path from "path";
import { readdir, readFile } from "fs/promises";
import { BreakpointBookmarksProvider } from "../providers/breakpoint-bookmarks.provider";

export const loadBookmarks =
  (provider: BreakpointBookmarksProvider) => async (item: any) => {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri
      ?.fsPath as string;
    const config = vscode.workspace.getConfiguration("breakpointBookmark");
    const saveLocation = config.get("saveLocation") as string;
    await provider.assureSaveDirectoryExist(saveLocation, workspacePath);
    const flowsPaths = await readdir(
      saveLocation
        ? `${saveLocation}`
        : path.join(workspacePath, ".vscode", "breakpoints")
    );
    const foundFilePath = flowsPaths.find((flowPath) => flowPath === item.id);
    if (foundFilePath) {
      const clearPreviousBreakpoints = config.get("clearPreviousBreakpoints");
      if (clearPreviousBreakpoints) {
        vscode.commands.executeCommand(
          "workbench.debug.viewlet.action.removeAllBreakpoints"
        );
      }

      const filePath = saveLocation
        ? `${saveLocation}/${foundFilePath}`
        : path.join(
            workspacePath,
            ".vscode",
            "breakpoints",
            `${foundFilePath}`
          );
      const flowData = await readFile(filePath, { encoding: "utf-8" });
      const breakpoints = JSON.parse(flowData);
      vscode.debug.addBreakpoints(
        breakpoints.map(
          (bp: vscode.Breakpoint) => ((bp as any).functionName?
            new vscode.FunctionBreakpoint( // for function breakpoint
              (bp as any).functionName,
              bp.enabled,
              bp.condition,
              bp.hitCondition,
              bp.logMessage
            ):
            new vscode.SourceBreakpoint( // for soruce/normal breakpoint
              new vscode.Location(
                vscode.Uri.file(`${(bp as any).location}`),
                new vscode.Range(
                  new vscode.Position(
                    (bp as any).range[0].line,
                    (bp as any).range[0].character
                  ),
                  new vscode.Position(
                    (bp as any).range[1].line,
                    (bp as any).range[1].character
                  )
                )
              ),
              bp.enabled,
              bp.condition,
              bp.hitCondition,
              bp.logMessage
            )
          )
        )
      );
      vscode.window.showInformationMessage(
        `Successfully loaded: ${item.label}`
      );
    } else {
      vscode.window.showErrorMessage(
        `Failed to load, flow not found: ${item.label}`
      );
      provider.refresh();
    }
  };
