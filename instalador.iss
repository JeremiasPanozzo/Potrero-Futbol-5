[Setup]
AppName=PotreroPro
AppVersion=1.0
AppPublisher=Tu Nombre o Empresa
DefaultDirName={autopf}\PotreroPro
DefaultGroupName=PotreroPro
OutputDir=instalador_output
OutputBaseFilename=PotreroPro_Instalador
Compression=lzma
SolidCompression=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "Crear acceso directo en el escritorio"; GroupDescription: "Opciones adicionales:"

[Files]
Source: "dist\PotreroPro.exe"; DestDir: "{app}"
Source: "icon.ico"; DestDir: "{app}"

[Icons]
Name: "{group}\PotreroPro"; Filename: "{app}\PotreroPro.exe"; IconFilename: "{app}\icon.ico"
Name: "{autodesktop}\PotreroPro"; Filename: "{app}\PotreroPro.exe"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\PotreroPro.exe"; Description: "Iniciar PotreroPro ahora"; Flags: nowait postinstall skipifsilent