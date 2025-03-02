#define MyAppName "GIFME"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "salvatoreascal"
#define MyAppURL ""
#define MyAppExeName "GIFME.exe"
#define MyAppIcon "build\icon.ico"

[Setup]
; NOTE: The value of AppId uniquely identifies this application.
; Do not use the same AppId value in installers for other applications.
AppId={{E8F5A8E1-6C5F-4B5A-9A8E-1C6F5B5A9A8E}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
OutputDir=dist_v2
OutputBaseFilename=GIFME-Setup
Compression=lzma
SolidCompression=yes
; Allow user to choose installation directory
AllowNoIcons=yes
; Always require admin privileges to avoid permission issues
PrivilegesRequired=admin
; Set a nice wizard image
WizardStyle=modern
WizardSizePercent=120
SetupIconFile={#MyAppIcon}
; Create application directory with full access permissions
DirExistsWarning=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1; Check: not IsAdminInstallMode

[Files]
Source: "dist_v2\packaged\GIFME-win32-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: quicklaunchicon

[Dirs]
Name: "{app}"; Permissions: users-full

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent runasoriginaluser

[Code]
// Add custom messages
procedure InitializeWizard;
begin
  WizardForm.WelcomeLabel1.Caption := 'Welcome to the GIFME Setup Wizard';
  WizardForm.WelcomeLabel2.Caption := 'This will install GIFME, a powerful MP4 to GIF converter, on your computer.' + #13#10 + #13#10 + 'It is recommended that you close all other applications before continuing.';
  WizardForm.FinishedLabel.Caption := 'GIFME has been installed on your computer.' + #13#10 + #13#10 + 'Click Finish to exit Setup and launch GIFME.';
end; 