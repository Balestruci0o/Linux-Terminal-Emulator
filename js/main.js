document.addEventListener('DOMContentLoaded', function() {
    const cliOutput = document.getElementById('cli-output');
    const cliInput = document.getElementById('cli-input');
    let commandHistory = [];
    let historyIndex = -1;
    let currentUser = 'user';
    let currentDir = '/home/user'; // Začať v domácom adresári užívateľa
    let envVars = { PATH: '/bin', USER: currentUser, HOME: '/home/user' };

    // --- Správa súborového systému ---

    /**
     * Inicializuje súborový systém v localStorage, ak neexistuje.
     * Nastaví vnorenú hierarchickú štruktúru súborového systému s predvolenými oprávneniami.
     */
    function initFileSystem() {
        if (!localStorage.getItem('linux_fs')) {
            console.log("Inicializujem nový súborový systém v localStorage...");
            const fs = {
                '/': { // Toto je koreňový objekt adresára
                    type: 'dir',
                    permissions: 'rwxr-xr-x', // Predvolené oprávnenia pre koreň
                    bin: { 
                        type: 'dir',
                        permissions: 'rwxr-xr-x'
                    },
                    home: {
                        type: 'dir',
                        permissions: 'rwxr-xr-x',
                        user: { 
                            type: 'dir',
                            permissions: 'rwxr-xr-x',
                            files: { // Súbory sú uložené v podobjekte 'files'
                                'welcome.txt': {
                                    content: "Welcome to Linux Terminal Emulator!\n\nThis is a browser-based terminal. All data is stored only in your browser's localStorage.\n\nTry these commands:\n- ls\n- cd [directory]\n- cat [file]\n- help\n\nFor more commands, type 'help'.",
                                    permissions: 'rw-r--r--'
                                },
                                '.bashrc': {
                                    content: "# Predvolený .bashrc súbor",
                                    permissions: 'rw-r--r--'
                                },
                                'notes.txt': {
                                    content: "Linux is great!\nProgramming is fun.\nBuild cool stuff.",
                                    permissions: 'rw-r--r--'
                                }
                            }
                        }
                    },
                    tmp: { 
                        type: 'dir',
                        permissions: 'rwxrwxrwx' // Dočasný adresár s oprávneniami na zápis pre všetkých
                    }
                }
            };
            localStorage.setItem('linux_fs', JSON.stringify(fs));
        }
    }

    // Inicializuje súborový systém pri načítaní
    initFileSystem();

    /**
     * Načíta aktuálny súborový systém z localStorage.
     * @returns {Object} Objekt súborového systému.
     */
    function getFS() {
        return JSON.parse(localStorage.getItem('linux_fs'));
    }

    /**
     * Uloží aktuálny súborový systém do localStorage.
     * @param {Object} fs - Objekt súborového systému na uloženie.
     */
    function saveFS(fs) {
        localStorage.setItem('linux_fs', JSON.stringify(fs));
    }

    /**
     * Normalizuje danú cestu, rozrieši '..', '.', a '~'
     * a spracuje redundantné lomítka. Vždy vráti absolútnu cestu.
     * @param {string} path - Cesta na normalizáciu.
     * @returns {string} Normalizovaná, absolútna cesta.
     */
    function normalizePath(path) {
        const parts = [];
        let tempPath = path;

        // Spracovanie skratky pre domovský adresár (~)
        if (tempPath.startsWith('~')) {
            tempPath = '/home/user' + tempPath.slice(1);
        }

        // Určenie, či je cesta absolútna (začína sa '/')
        const isAbsolute = tempPath.startsWith('/');
        
        // Rozdelenie cesty na segmenty, odfiltrovanie prázdnych reťazcov (napr. z "//" alebo koncového "/")
        const segments = tempPath.split('/').filter(s => s !== '');

        // Pre relatívne cesty začnite stavať z normalizovaných segmentov aktuálneho adresára
        if (!isAbsolute) {
            normalizePath(currentDir).split('/').filter(s => s !== '').forEach(s => parts.push(s));
        }

        // Spracovanie každého segmentu
        for (const segment of segments) {
            if (segment === '.') {
                // Aktuálny adresár, nič nerobte
            } else if (segment === '..') {
                // Choďte o úroveň vyššie, pokiaľ nie ste v koreni pre absolútnu cestu
                if (parts.length > 0) {
                    parts.pop();
                } 
                // Ak je absolútna a parts je prázdne, sme v koreni, nič nerobte.
            } else {
                parts.push(segment);
            }
        }

        // Vytvorte finálnu normalizovanú cestu. Ak žiadne časti, je to koreňový adresár.
        if (parts.length === 0) {
            return '/'; 
        }
        return '/' + parts.join('/');
    }

    /**
     * Získa záznam adresára zo súborového systému.
     * Táto funkcia predpokladá vnorenú štruktúru súborového systému začínajúcu z fs['/'].
     * @param {Object} fs - Objekt súborového systému (objekt najvyššej úrovne z localStorage).
     * @param {string} path - Cesta k adresáru (bude normalizovaná).
     * @returns {Object|null} Objekt adresára, ak sa nájde a je to adresár, inak null.
     */
    function getDirectoryEntry(fs, path) {
        const normalizedPath = normalizePath(path);
        // Skutočný koreňový objekt v našom obalovom objekte 'fs' je fs['/']
        let current = fs['/']; 

        // Ak je normalizovaná cesta iba '/', vráťte priamo koreňový adresár
        if (normalizedPath === '/') {
            return current;
        }

        // Rozdelte cestu na časti, ignorujúc úvodné '/' (preto filter prázdneho reťazca)
        const parts = normalizedPath.split('/').filter(p => p !== ''); 

        // Prechádzajte súborovým systémom
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            // Skontrolujte, či časť existuje v aktuálnom adresári a je adresárom
            if (!current[part] || current[part].type !== 'dir') {
                return null; // Segment cesty sa nenašiel alebo nie je adresárom
            }
            current = current[part]; // Posuňte sa hlbšie do adresára
        }
        return current; // Vráťte nájdený objekt adresára
    }

    /**
     * Získa záznam súboru a jeho rodičovský adresár zo súborového systému.
     * Táto funkcia predpokladá vnorenú štruktúru súborového systému.
     * @param {Object} fs - Objekt súborového systému.
     * @param {string} path - Cesta k súboru (bude normalizovaná).
     * @returns {{dir: Object, filename: string, file: Object}|null} Objekt obsahujúci rodičovský adresár, názov súboru a objekt súboru, alebo null, ak sa nenájde alebo nie je súborom.
     */
    function getFileEntry(fs, path) {
        const normalizedPath = normalizePath(path);
        const parts = normalizedPath.split('/').filter(p => p !== '');
        const filename = parts.pop(); // Posledná časť je názov súboru
        const dirPath = '/' + parts.join('/'); // Zvyšné časti tvoria cestu k adresáru

        // Získajte rodičovský adresár pomocou getDirectoryEntry
        const dirEntry = getDirectoryEntry(fs, dirPath);

        // Skontrolujte, či adresár existuje, je adresárom, má objekt 'files' a súbor existuje v 'files'
        if (!dirEntry || dirEntry.type !== 'dir' || !dirEntry.files || !dirEntry.files[filename]) {
            return null; // Adresár alebo súbor sa nenašiel, alebo nie je súborom
        }
        return { dir: dirEntry, filename: filename, file: dirEntry.files[filename] };
    }

    /**
     * Rozrieši cestu k jej rodičovskému adresáru a názvu položky.
     * Toto je užitočné pre príkazy ako mv, cp, rm, mkdir, touch, chmod, kde potrebujete
     * poznať rodiča a názov cieľovej položky.
     * @param {Object} fs - Objekt súborového systému.
     * @param {string} path - Cesta na rozriešenie.
     * @returns {{parent: Object|null, name: string, entry: Object|null, exists: boolean, isDir: boolean, isFile: boolean, pathSegments: string[]}|null}
     * Vráti null, ak rodičovská cesta neexistuje. `entry` je null, ak `exists` je false.
     */
    function resolvePathToParent(fs, path) {
        const normalizedPath = normalizePath(path);
        const parts = normalizedPath.split('/').filter(p => p !== '');
        
        if (parts.length === 0) { // Cesta je '/' (koreň)
            return { parent: null, name: '/', entry: fs['/'], exists: true, isDir: true, isFile: false, pathSegments: ['/'] };
        }

        const name = parts[parts.length - 1]; // Posledná časť je názov položky
        const parentPathSegments = parts.slice(0, parts.length - 1);
        const parentPath = '/' + parentPathSegments.join('/');
        
        const parentDir = getDirectoryEntry(fs, parentPath);

        if (!parentDir) { // Rodičovský adresár neexistuje alebo nie je adresárom
            return null;
        }

        // Skontrolujte, či samotná položka existuje a jej typ
        let exists = false;
        let isDir = false;
        let isFile = false;
        let entry = null;

        if (parentDir[name] && parentDir[name].type === 'dir') {
            exists = true;
            isDir = true;
            entry = parentDir[name];
        } else if (parentDir.files && parentDir.files[name]) {
            exists = true;
            isFile = true;
            entry = parentDir.files[name];
        }

        return { parent: parentDir, name: name, entry: entry, exists: exists, isDir: isDir, isFile: isFile, pathSegments: parts };
    }

    // --- Pomocné funkcie pre oprávnenia ---

    /**
     * Konvertuje osmičkové oprávnenia (napr. '755') na symbolický reťazec (napr. 'rwxr-xr-x').
     * @param {string} octal - 3-miestny osmičkový reťazec oprávnení (napr. '755').
     * @returns {string} 9-znakový symbolický reťazec oprávnení, alebo '---------' pre neplatný vstup.
     */
    function octalToSymbolic(octal) {
        if (typeof octal !== 'string' || octal.length !== 3) {
            return '---------'; // Predvolené pre neplatný vstup
        }
        const permsMap = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];
        let symbolic = '';
        for (let i = 0; i < 3; i++) {
            const digit = parseInt(octal[i], 10);
            if (isNaN(digit) || digit < 0 || digit > 7) {
                return '---------'; // Neplatná osmičková číslica
            }
            symbolic += permsMap[digit];
        }
        return symbolic;
    }

    // --- Rekurzívne pomocné funkcie ---

    /**
     * Rekurzívne vymaže adresár a jeho obsah zo súborového systému.
     * Táto funkcia predpokladá, že `currentDirEntry` je objekt adresára v rámci FS.
     * @param {Object} currentDirEntry - Objekt adresára, ktorého obsah bude vymazaný.
     */
    function deleteDirectoryContents(currentDirEntry) {
        // Najprv vymažte podadresáre
        for (const key in currentDirEntry) {
            if (key !== 'type' && key !== 'files' && typeof currentDirEntry[key] === 'object') {
                // Uistite sa, že ide o platný objekt adresára pred rekurziou
                if (currentDirEntry[key].type === 'dir') {
                    deleteDirectoryContents(currentDirEntry[key]); // Rekurzívny zostup do podadresára
                    delete currentDirEntry[key]; // Potom vymažte samotný podadresár
                }
            }
        }
        // Vymažte súbory
        if (currentDirEntry.files) {
            for (const filename in currentDirEntry.files) {
                delete currentDirEntry.files[filename];
            }
            delete currentDirEntry.files; // Vymažte samotný objekt 'files'
        }
    }

    /**
     * Rekurzívne skopíruje zdrojový adresár/súbor do cieľa.
     * Táto funkcia spracováva hĺbkové klonovanie objektov, aby sa predišlo problémom s referenciami.
     * @param {Object} sourceEntry - Objekt položky (adresár alebo súbor) na kopírovanie.
     * @param {Object} destParentEntry - Rodičovský objekt adresára, kam sa kópia umiestni.
     * @param {string} destName - Názov novej skopírovanej položky v cieli.
     */
    function copyRecursive(sourceEntry, destParentEntry, destName) {
        if (sourceEntry.type === 'dir') {
            // Vytvorte cieľový adresár s jeho vlastnosťami (napr. oprávneniami)
            destParentEntry[destName] = JSON.parse(JSON.stringify(sourceEntry)); // Hĺbkové kopírovanie vlastností
            destParentEntry[destName].files = {}; // Inicializujte prázdny objekt súborov pre nový adresár
            
            const newDestDirEntry = destParentEntry[destName];

            // Skopírujte podadresáre
            for (const key in sourceEntry) {
                if (key !== 'type' && key !== 'files' && sourceEntry[key].type === 'dir') {
                    copyRecursive(sourceEntry[key], newDestDirEntry, key);
                }
            }
            // Skopírujte súbory
            if (sourceEntry.files) {
                newDestDirEntry.files = {}; // Vytvorte objekt súborov pre nový adresár
                for (const filename in sourceEntry.files) {
                    // Hĺbkové kopírovanie obsahu a vlastností súboru
                    newDestDirEntry.files[filename] = JSON.parse(JSON.stringify(sourceEntry.files[filename]));
                }
            }
        } else { // Ide o súbor
            if (!destParentEntry.files) destParentEntry.files = {};
            destParentEntry.files[destName] = JSON.parse(JSON.stringify(sourceEntry)); // Hĺbkové kopírovanie súboru
        }
    }


    // --- Implementácia príkazov ---

    const commands = {
        'help': {
            desc: 'Show help information about available commands.',
            execute: () => {
                typeOutput("Available commands:");
                Object.keys(commands).sort().forEach(cmd => { // Zoradiť príkazy abecedne
                    typeOutput(`  ${cmd}${commands[cmd].desc ? ' - ' + commands[cmd].desc : ''}`);
                });
            }
        },
        'ls': {
            desc: 'List directory contents. Use -l for long listing format.',
            execute: (args) => {
                const longFormat = args.includes('-l');
                const pathArgs = args.filter(arg => arg !== '-l'); // Odfiltrovať -l
                const pathArg = pathArgs.length > 0 ? pathArgs[0] : null; // Získať skutočný argument cesty, ak je prítomný

                const targetPath = pathArg ? normalizePath(pathArg) : currentDir;
                const fs = getFS();
                const dirEntry = getDirectoryEntry(fs, targetPath);

                if (!dirEntry || dirEntry.type !== 'dir') {
                    return typeOutput(`ls: cannot access '${pathArg || targetPath}': No such file or directory`);
                }

                const contents = [];
                
                if (longFormat) {
                    // Pridajte '.' a '..' pre dlhý zoznam (zjednodušené, hardcoded oprávnenia/vlastník/skupina/dátum)
                    // Oprávnenia sú odvodené zo skutočných záznamov adresára
                    const dotEntry = { name: '.', type: 'dir', permissions: dirEntry.permissions || 'rwxr-xr-x', size: 0 };
                    contents.push(dotEntry);
                    
                    const parentPath = normalizePath(currentDir + '/..');
                    const parentDirEntry = getDirectoryEntry(fs, parentPath);
                    const dotDotEntry = { name: '..', type: 'dir', permissions: parentDirEntry ? (parentDirEntry.permissions || 'rwxr-xr-x') : 'rwxr-xr-x', size: 0 };
                    contents.push(dotDotEntry);

                    // Pridajte podadresáre
                    for (const key in dirEntry) {
                        if (key !== 'type' && key !== 'files' && dirEntry[key].type === 'dir') {
                            const perms = dirEntry[key].permissions || 'rwxr-xr-x';
                            contents.push({ name: key, type: 'dir', permissions: perms, size: 0 }); // Veľkosť pre adresáre nie je skutočne sledovaná
                        }
                    }
                    // Pridajte súbory
                    if (dirEntry.files) {
                        for (const filename in dirEntry.files) {
                            const file = dirEntry.files[filename];
                            const perms = file.permissions || 'rw-r--r--';
                            contents.push({ name: filename, type: 'file', permissions: perms, size: file.content.length });
                        }
                    }
                    // Zoraďte podľa názvu pre zobrazenie dlhého formátu
                    contents.sort((a, b) => a.name.localeCompare(b.name));

                    // Formátovanie pre dlhý zoznam
                    const formattedOutput = contents.map(item => {
                        const typeChar = item.type === 'dir' ? 'd' : '-';
                        // Vyplňte veľkosť pre zarovnanie, použite pevnú šírku (napr. 6 znakov)
                        const sizeStr = (item.type === 'file' ? item.size : '').toString().padEnd(6); 
                        const name = item.type === 'dir' ? `<span style="color: #66b3ff">${item.name}</span>` : item.name;
                        // Zjednodušený vlastník, skupina a dátum
                        return `${typeChar}${item.permissions} 1 user user ${sizeStr} Jan 1 12:00 ${name}`; 
                    }).join('\n');
                    typeOutput(formattedOutput || '');
                } else {
                    // Štandardný výstup 'ls'
                    const standardContents = [];
                    // Pridajte podadresáre
                    for (const key in dirEntry) {
                        if (key !== 'type' && key !== 'files' && dirEntry[key].type === 'dir') {
                            standardContents.push({ name: key, type: 'dir' });
                        }
                    }
                    // Pridajte súbory
                    if (dirEntry.files) {
                        for (const filename in dirEntry.files) {
                            standardContents.push({ name: filename, type: 'file' });
                        }
                    }
                    const sortedStandardContents = standardContents.sort((a, b) => a.name.localeCompare(b.name));
                    const formatted = sortedStandardContents.map(item => {
                        if (item.type === 'dir') {
                            return `<span style="color: #66b3ff">${item.name}</span>`; 
                        }
                        return item.name;
                    }).join('  ');
                    const p = document.createElement('p');
                    p.innerHTML = formatted || '';
                    cliOutput.appendChild(p);
                }
            }
        },
        'cat': {
            desc: 'Concatenate and display file content.',
            execute: (args) => {
                if (!args.length) return typeOutput("Usage: cat [file]");
                
                const fs = getFS();
                const fileEntry = getFileEntry(fs, args[0]);

                if (!fileEntry) {
                    return typeOutput(`cat: ${args[0]}: No such file or directory`);
                }
                
                typeOutput(fileEntry.file.content);
            }
        },
        'cd': {
            desc: 'Change the current directory.',
            execute: (args) => {
                const targetPath = args[0] ? normalizePath(args[0]) : '/home/user';
                const fs = getFS();
                const dirEntry = getDirectoryEntry(fs, targetPath);
                
                if (!dirEntry || dirEntry.type !== 'dir') {
                    return typeOutput(`cd: ${args[0]}: No such file or directory`);
                }
                
                currentDir = targetPath; // Aktualizovať aktuálny adresár
                updatePrompt(); // Aktualizovať zobrazený prompt
            }
        },
        'pwd': {
            desc: 'Print the name of the current working directory.',
            execute: () => {
                typeOutput(currentDir);
            }
        },
        'mkdir': {
            desc: 'Make directories.',
            execute: (args) => {
                if (!args.length) return typeOutput("Usage: mkdir [directory]");
                
                const targetPath = normalizePath(args[0]);
                const fs = getFS();
                
                const resolved = resolvePathToParent(fs, targetPath);
                if (!resolved) { // To znamená, že samotná rodičovská cesta neexistuje
                    return typeOutput(`mkdir: cannot create directory '${args[0]}': No such file or directory.`);
                }

                if (resolved.exists) { // Položka už existuje na cieľovej ceste
                    return typeOutput(`mkdir: cannot create directory '${args[0]}': File exists`);
                }
                // Predvolené oprávnenia pre nový adresár
                resolved.parent[resolved.name] = { type: 'dir', permissions: 'rwxr-xr-x' }; 
                saveFS(fs); // Uložiť zmeny do localStorage
                typeOutput(`Directory '${args[0]}' created`);
            }
        },
        'touch': {
            desc: 'Change file timestamps. Create file if it does not exist.',
            execute: (args) => {
                if (!args.length) return typeOutput("Usage: touch [file]");
                
                const targetPath = normalizePath(args[0]);
                const fs = getFS();
                
                const resolved = resolvePathToParent(fs, targetPath);
                if (!resolved) { // Rodičovský adresár neexistuje
                    return typeOutput(`touch: cannot create file '${args[0]}': No such file or directory.`);
                }

                if (resolved.exists) { // Položka už existuje na cieľovej ceste
                    if (resolved.isFile) {
                        // V reálnom systéme by sa aktualizovala časová pečiatka. Tu len potvrdzujeme.
                        return typeOutput(`touch: updated timestamp for '${args[0]}' (simulated)`); 
                    } else if (resolved.isDir) {
                        return typeOutput(`touch: cannot touch '${args[0]}': Is a directory`);
                    }
                }

                // Ak objekt 'files' v rodičovskom adresári neexistuje, vytvorte ho
                if (!resolved.parent.files) resolved.parent.files = {};
                
                resolved.parent.files[resolved.name] = { 
                    content: '', 
                    permissions: 'rw-r--r--', // Predvolené oprávnenia pre nový súbor
                    // Pridajte zjednodušenú časovú pečiatku pre konzistentnosť `ls -l`, ak bude potrebné neskôr
                };
                saveFS(fs); // Uložiť zmeny do localStorage
                typeOutput(`File '${args[0]}' created`);
            }
        },
        'edit': {
            desc: 'Edit file content in multi-line mode (type EOF on new line to save).',
            execute: (args) => {
                if (!args.length) return typeOutput("Usage: edit [filename]");
                
                const fs = getFS();
                const fileEntry = getFileEntry(fs, args[0]);

                if (!fileEntry) {
                    return typeOutput(`edit: ${args[0]}: No such file`);
                }
                
                typeOutput(`Editing '${args[0]}' (type 'EOF' on new line to save)`);
                typeOutput("Current content:");
                typeOutput(fileEntry.file.content);
                
                let editingContent = [];
                const originalProcess = window.processCommand; // Uložiť pôvodnú funkciu spracovania príkazov
                
                // Prepísať processCommand pre spracovanie viacriadkového vstupu pre úpravu
                window.processCommand = function(line) {
                    if (line === 'EOF') {
                        fileEntry.file.content = editingContent.join('\n'); // Uložiť obsah
                        saveFS(fs); // Uložiť zmeny do localStorage
                        typeOutput(`File '${args[0]}' saved`);
                        window.processCommand = originalProcess; // Obnoviť pôvodnú funkciu spracovania príkazov
                        cliInput.focus(); // Znovu zaostriť na vstupné pole
                        updatePrompt(); // Aktualizovať prompt po úprave
                        return;
                    }
                    editingContent.push(line); // Pridať riadok do obsahu
                };
            }
        },
        'rm': {
            desc: 'Remove files or directories. Use -r for recursive removal of non-empty directories.',
            execute: (args) => {
                const recursive = args.includes('-r');
                // Nájdite argument cesty, ktorý nie je '-r'
                const pathArgs = args.filter(arg => arg !== '-r');
                const targetPathArg = pathArgs.length > 0 ? pathArgs[0] : null;

                if (!targetPathArg) return typeOutput("Usage: rm [-r] [file/directory]");
                
                const targetPath = normalizePath(targetPathArg);
                const fs = getFS();
                
                const resolved = resolvePathToParent(fs, targetPath);
                if (!resolved || !resolved.exists) {
                    return typeOutput(`rm: cannot remove '${targetPathArg}': No such file or directory`);
                }

                // Zabrániť odstráneniu koreňa alebo špeciálnych adresárov ako . alebo ..
                if (targetPath === '/' || resolved.name === '.' || resolved.name === '..') {
                    return typeOutput(`rm: cannot remove special directory '${targetPathArg}'.`);
                }
                
                // Ak je to súbor, odstráňte ho z parent.files
                if (resolved.isFile) {
                    delete resolved.parent.files[resolved.name];
                    saveFS(fs);
                    return typeOutput(`Removed file '${targetPathArg}'`);
                }
                
                // Ak je to adresár
                if (resolved.isDir) {
                    const dirEntry = resolved.entry; // Použite resolved.entry pre objekt adresára
                    const dirContentKeys = Object.keys(dirEntry).filter(key => key !== 'type' && key !== 'files');
                    const filesInDir = dirEntry.files ? Object.keys(dirEntry.files) : [];

                    if ((dirContentKeys.length > 0 || filesInDir.length > 0) && !recursive) {
                        return typeOutput(`rm: cannot remove '${targetPathArg}': Directory not empty. Use 'rm -r' to remove non-empty directories.`);
                    }

                    // Vykonajte rekurzívne odstránenie, ak je zadané -r
                    if (recursive) {
                        deleteDirectoryContents(dirEntry); // Rekurzívne vymazať obsah
                    }
                    
                    delete resolved.parent[resolved.name]; // Odstrániť samotnú vlastnosť adresára
                    saveFS(fs);
                    return typeOutput(`Removed directory '${targetPathArg}'`);
                }
            }
        },
        'rmdir': {
            desc: 'Remove empty directories.',
            execute: (args) => {
                if (!args.length) return typeOutput("Usage: rmdir [directory]");

                const targetPath = normalizePath(args[0]);
                const fs = getFS();

                const resolved = resolvePathToParent(fs, targetPath);

                if (!resolved || !resolved.exists) {
                    return typeOutput(`rmdir: failed to remove '${args[0]}': No such file or directory`);
                }
                if (!resolved.isDir) {
                    return typeOutput(`rmdir: failed to remove '${args[0]}': Not a directory`);
                }
                // Zabrániť odstráneniu koreňa alebo špeciálnych adresárov ako . alebo ..
                if (targetPath === '/' || resolved.name === '.' || resolved.name === '..') {
                    return typeOutput(`rmdir: cannot remove special directory '${args[0]}'.`);
                }

                const dirEntry = resolved.entry; // Použite resolved.entry pre objekt adresára
                const dirContentKeys = Object.keys(dirEntry).filter(key => key !== 'type' && key !== 'files');
                const filesInDir = dirEntry.files ? Object.keys(dirEntry.files) : [];

                if (dirContentKeys.length > 0 || filesInDir.length > 0) {
                    return typeOutput(`rmdir: failed to remove '${args[0]}': Directory not empty`);
                }

                delete resolved.parent[resolved.name];
                saveFS(fs);
                typeOutput(`Removed directory '${args[0]}'`);
            }
        },
        'mv': {
            desc: 'Move or rename files/directories. Supports multiple sources to a directory.',
            execute: (args) => {
                if (args.length < 2) return typeOutput("Usage: mv [source] [destination] OR mv [source1] [source2...] [directory]");

                const fs = getFS();
                const sources = args.slice(0, args.length - 1);
                const destination = normalizePath(args[args.length - 1]);

                const destResolved = resolvePathToParent(fs, destination);

                // Ak cieľ existuje a je adresárom, všetky zdroje sa presunú do neho
                if (destResolved && destResolved.isDir) {
                    for (const sourcePathArg of sources) {
                        const sourcePath = normalizePath(sourcePathArg);
                        const sourceResolved = resolvePathToParent(fs, sourcePath);

                        if (!sourceResolved || !sourceResolved.exists) {
                            typeOutput(`mv: cannot stat '${sourcePathArg}': No such file or directory`);
                            continue; // Pokračovať na ďalší zdroj
                        }
                        if (sourcePath === '/' || sourceResolved.name === '.' || sourceResolved.name === '..') {
                            typeOutput(`mv: cannot move special directory '${sourcePathArg}'.`);
                            continue;
                        }

                        // Skontrolujte, či názov cieľa už existuje v cieľovom adresári
                        if ((destResolved.entry[sourceResolved.name] && destResolved.entry[sourceResolved.name].type === 'dir') || 
                            (destResolved.entry.files && destResolved.entry.files[sourceResolved.name])) {
                            typeOutput(`mv: cannot move '${sourcePathArg}' to '${destination}/${sourceResolved.name}': Target exists`);
                            continue;
                        }

                        // Vykonajte presun (skopírujte na nové miesto, potom vymažte zo starého)
                        if (sourceResolved.isFile) {
                            if (!destResolved.entry.files) destResolved.entry.files = {};
                            destResolved.entry.files[sourceResolved.name] = sourceResolved.entry;
                            delete sourceResolved.parent.files[sourceResolved.name];
                        } else { // Je to adresár
                            destResolved.entry[sourceResolved.name] = sourceResolved.entry;
                            delete sourceResolved.parent[sourceResolved.name];
                        }
                        typeOutput(`Moved '${sourcePathArg}' to '${destination}/${sourceResolved.name}'`);
                    }
                } 
                // Ak je iba jeden zdroj a cieľ neexistuje alebo je súborom, ide o premenovanie/prepísanie
                else if (sources.length === 1) {
                    const sourcePath = normalizePath(sources[0]);
                    const sourceResolved = resolvePathToParent(fs, sourcePath);

                    if (!sourceResolved || !sourceResolved.exists) {
                        return typeOutput(`mv: cannot stat '${sourcePath}': No such file or directory`);
                    }
                    if (sourcePath === '/' || sourceResolved.name === '.' || sourceResolved.name === '..') {
                        return typeOutput(`mv: cannot move special directory '${sourcePath}'.`);
                    }

                    // Skontrolujte, či rodič cieľa existuje
                    const destParentPathSegments = normalizePath(destination).split('/').filter(p => p !== '').slice(0, -1);
                    const guessedParentPath = '/' + destParentPathSegments.join('/');
                    const finalDestParent = getDirectoryEntry(fs, guessedParentPath);
                    const finalDestName = destination.split('/').pop();

                    if (!finalDestParent) {
                        return typeOutput(`mv: cannot create '${destination}': No such file or directory`);
                    }

                    if (destResolved && destResolved.exists) {
                        // Cieľ existuje, skontrolujte, či je to adresár a nie je prázdny
                        if (destResolved.isDir) {
                            const dirEntry = destResolved.entry;
                            const dirContentKeys = Object.keys(dirEntry).filter(key => key !== 'type' && key !== 'files');
                            const filesInDir = dirEntry.files ? Object.keys(dirEntry.files) : [];
                            if (dirContentKeys.length > 0 || filesInDir.length > 0) {
                                return typeOutput(`mv: cannot overwrite non-empty directory '${destination}' with '${sources[0]}'`);
                            }
                            // Ak je prázdny adresár, odstráňte ho pred presunom nového adresára
                            deleteDirectoryContents(dirEntry); // Zabezpečte čisté odstránenie
                            delete destResolved.parent[destResolved.name];
                        } else { // Je to súbor, prepíšeme ho
                            delete destResolved.parent.files[destResolved.name];
                        }
                    }
                    
                    // Vykonajte operáciu premenovania/presunu
                    if (sourceResolved.isFile) {
                        if (!finalDestParent.files) finalDestParent.files = {};
                        finalDestParent.files[finalDestName] = sourceResolved.entry;
                        delete sourceResolved.parent.files[sourceResolved.name];
                    } else if (sourceResolved.isDir) {
                        finalDestParent[finalDestName] = sourceResolved.entry;
                        delete sourceResolved.parent[sourceResolved.name];
                    }
                    typeOutput(`Moved '${sources[0]}' to '${destination}'`);

                } else {
                    typeOutput("mv: destination must be a directory if multiple sources are specified.");
                }
                saveFS(fs);
            }
        },
        'cp': {
            desc: 'Copy files or directories. Use -r for recursive copy of directories. Supports multiple sources to a directory.',
            execute: (args) => {
                const recursiveFlagIndex = args.indexOf('-r');
                const recursive = recursiveFlagIndex !== -1;

                let actualArgs = args;
                if (recursive) {
                    actualArgs = args.filter((_, i) => i !== recursiveFlagIndex);
                }

                if (actualArgs.length < 2) {
                    return typeOutput("Usage: cp [-r] [source1] [source2...] [destination_directory] OR cp [source_file] [destination_file]");
                }

                const fs = getFS();
                const sources = actualArgs.slice(0, actualArgs.length - 1);
                const destination = normalizePath(actualArgs[actualArgs.length - 1]);

                const destResolved = resolvePathToParent(fs, destination);

                // Prípad 1: Viacero zdrojov alebo cieľ je existujúci adresár
                if (sources.length > 1 || (destResolved && destResolved.isDir)) {
                    if (!destResolved || !destResolved.isDir) {
                        return typeOutput(`cp: target '${destination}' is not a directory`);
                    }
                    const targetDir = destResolved.entry;

                    for (const sourcePathArg of sources) {
                        const sourcePath = normalizePath(sourcePathArg);
                        const sourceResolved = resolvePathToParent(fs, sourcePath);

                        if (!sourceResolved || !sourceResolved.exists) {
                            typeOutput(`cp: cannot stat '${sourcePathArg}': No such file or directory`);
                            continue;
                        }
                        if (sourcePath === '/' || sourceResolved.name === '.' || sourceResolved.name === '..') {
                            typeOutput(`cp: cannot copy special directory '${sourcePathArg}'.`);
                            continue;
                        }
                        if (sourceResolved.isDir && !recursive) {
                            typeOutput(`cp: -r not specified; omitting directory '${sourcePathArg}'`);
                            continue;
                        }
                        if ((targetDir[sourceResolved.name] && targetDir[sourceResolved.name].type === 'dir') ||
                            (targetDir.files && targetDir.files[sourceResolved.name])) {
                            typeOutput(`cp: cannot copy '${sourcePathArg}' to '${destination}/${sourceResolved.name}': Target exists`);
                            continue;
                        }
                        copyRecursive(sourceResolved.entry, targetDir, sourceResolved.name);
                        typeOutput(`Copied '${sourcePathArg}' to '${destination}/${sourceResolved.name}'`);
                    }
                } 
                // Prípad 2: Jeden zdroj a cieľ nie je existujúci adresár (premenovanie/prepísanie)
                else if (sources.length === 1) {
                    const sourcePath = normalizePath(sources[0]);
                    const sourceResolved = resolvePathToParent(fs, sourcePath);

                    if (!sourceResolved || !sourceResolved.exists) {
                        return typeOutput(`cp: cannot stat '${sourcePath}': No such file or directory`);
                    }
                    if (sourcePath === '/' || sourceResolved.name === '.' || sourceResolved.name === '..') {
                        return typeOutput(`cp: cannot copy special directory '${sourcePath}'.`);
                    }
                    if (sourceResolved.isDir && !recursive) {
                        return typeOutput(`cp: -r not specified; omitting directory '${sourcePath}'`);
                    }

                    // Skontrolujte, či rodič cieľa existuje
                    const destParentPathSegments = normalizePath(destination).split('/').filter(p => p !== '').slice(0, -1);
                    const guessedParentPath = '/' + destParentPathSegments.join('/');
                    const finalDestParent = getDirectoryEntry(fs, guessedParentPath);
                    const finalDestName = destination.split('/').pop();

                    if (!finalDestParent) {
                        return typeOutput(`cp: cannot create '${destination}': No such file or directory`);
                    }

                    if (destResolved && destResolved.exists) {
                        // Cieľ existuje, skontrolujte, či je to adresár a nie je prázdny
                        if (destResolved.isDir) { 
                            const dirEntry = destResolved.entry;
                            const dirContentKeys = Object.keys(dirEntry).filter(key => key !== 'type' && key !== 'files');
                            const filesInDir = dirEntry.files ? Object.keys(dirEntry.files) : [];
                            if (dirContentKeys.length > 0 || filesInDir.length > 0) {
                                return typeOutput(`cp: cannot overwrite non-empty directory '${destination}' with '${sourcePath}'`);
                            }
                            deleteDirectoryContents(dirEntry);
                            delete destResolved.parent[destResolved.name];
                        } else { // Je to súbor, prepíšeme ho
                            delete destResolved.parent.files[destResolved.name];
                        }
                    }
                    copyRecursive(sourceResolved.entry, finalDestParent, finalDestName);
                    typeOutput(`Copied '${sourcePath}' to '${destination}'`);
                } else {
                    typeOutput("cp: missing destination file operand after multiple sources.\nUsage: cp [-r] [source1] [source2...] [directory]");
                }
                saveFS(fs);
            }
        },
        'echo': {
            desc: 'Display a line of text.',
            execute: (args) => {
                typeOutput(args.join(' '));
            }
        },
        'clear': {
            desc: 'Clear the terminal screen.',
            execute: () => {
                cliOutput.innerHTML = ''; // Vymazať všetok obsah
            }
        },
        'whoami': {
            desc: 'Print effective userid.',
            execute: () => {
                typeOutput(currentUser);
            }
        },
        'date': {
            desc: 'Print or set the system date and time.',
            execute: () => {
                typeOutput(new Date().toString());
            }
        },
        'history': {
            desc: 'Display or manipulate the history list. Use -c to clear history.',
            execute: (args) => {
                if (args.includes('-c')) {
                    commandHistory = [];
                    historyIndex = -1;
                    typeOutput("Command history cleared.");
                } else {
                    if (commandHistory.length === 0) {
                        typeOutput("History is empty.");
                    } else {
                        commandHistory.forEach((cmd, i) => {
                            typeOutput(` ${i + 1}  ${cmd}`);
                        });
                    }
                }
            }
        },
        'man': {
            desc: 'Display manual page for a command.',
            execute: (args) => {
                const commandName = args[0];
                const manPages = {
                    'help': 'help - Display information about available commands.\nUsage: help',
                    'ls': 'ls - List directory contents.\nUsage: ls [directory]\nUsage: ls -l [directory] (long listing format showing permissions, size, etc.)',
                    'cat': 'cat - Concatenate and display file content.\nUsage: cat [file]',
                    'cd': 'cd - Change the current directory.\nUsage: cd [directory]',
                    'pwd': 'pwd - Print the name of the current working directory.\nUsage: pwd',
                    'mkdir': 'mkdir - Make directories.\nUsage: mkdir [directory]',
                    'touch': 'touch - Change file timestamps. Create file if it does not exist.\nUsage: touch [file]',
                    'edit': 'edit - Edit file content in multi-line mode (type EOF on new line to save).\nUsage: edit [file]',
                    'rm': 'rm - Remove files or directories.\nUsage: rm [file/directory]\nUsage: rm -r [directory] (recursive removal for non-empty directories)',
                    'rmdir': 'rmdir - Remove empty directories.\nUsage: rmdir [directory]',
                    'mv': 'mv - Move or rename files and directories.\nUsage: mv [source] [destination]\nUsage: mv [source1] [source2...] [directory]',
                    'cp': 'cp - Copy files or directories.\nUsage: cp [source_file] [destination_file_or_directory]\nUsage: cp -r [source_directory] [destination_directory]\nUsage: cp [-r] [source1] [source2...] [directory]',
                    'echo': 'echo - Display a line of text.\nUsage: echo [text...]',
                    'clear': 'clear - Clear the terminal screen.\nUsage: clear',
                    'whoami': 'whoami - Print effective userid.\nUsage: whoami',
                    'date': 'date - Print or set the system date and time.\nUsage: date',
                    'history': 'history - Display or manipulate the history list.\nUsage: history [-c] (-c to clear history)',
                    'man': 'man - Display manual page for a command.\nUsage: man [command]',
                    'uname': 'uname - Print system information.\nUsage: uname',
                    'find': 'find - Search for files in a directory hierarchy.\nUsage: find [path] -name [pattern]',
                    'head': 'head - Output the first part of files.\nUsage: head [-n num_lines] [file]',
                    'tail': 'tail - Output the last part of files.\nUsage: tail [-n num_lines] [file]',
                    'wc': 'wc - Print newline, word, and byte counts for a file.\nUsage: wc [file]',
                    'chmod': 'chmod - Change file mode bits (permissions).\nUsage: chmod [octal_permissions] [file/directory]\nExample: chmod 755 myfile.sh (simulated permissions)',
                    'grep': 'grep - Print lines matching a pattern.\nUsage: grep [pattern] [file]',
                    'clear_history': 'clear_history - Clear the command history.\nUsage: clear_history',
                    'clear_fs': 'clear_fs - Reset the entire file system in localStorage to its initial state.\nUsage: clear_fs'
                };

                if (!commandName) {
                    typeOutput("What manual page do you want?\nAvailable man pages: " + Object.keys(manPages).sort().join(', '));
                } else if (manPages[commandName]) {
                    typeOutput(manPages[commandName]);
                } else {
                    typeOutput(`No manual entry for ${commandName}`);
                }
            }
        },
        'uname': {
            desc: 'Print system information',
            execute: () => {
                typeOutput('Linux browser 2.0.2-release');
            }
        },
        'find': {
            desc: 'Search for files in a directory hierarchy.',
            execute: (args) => {
                // Základné vyhľadávanie: find [cesta] -name [vzorka]
                if (args.length < 3 || args[1] !== '-name') {
                    return typeOutput("Usage: find [path] -name [pattern]");
                }

                const startPath = normalizePath(args[0]);
                const searchPattern = args[2];
                const fs = getFS();
                const results = [];

                const startDirEntry = getDirectoryEntry(fs, startPath);
                if (!startDirEntry) {
                    return typeOutput(`find: '${args[0]}': No such file or directory`);
                }

                /**
                 * Rekurzívna pomocná funkcia pre vyhľadávanie.
                 * @param {Object} currentEntry - Aktuálny objekt adresára/súboru.
                 * @param {string} currentFullPath - Úplná cesta k aktuálnej položke.
                 */
                function search(currentEntry, currentFullPath) {
                    // Skontrolujte samotnú aktuálnu položku (iba ak to nie je koreňová cesta pri spúšťaní vyhľadávania)
                    const entryName = currentFullPath.split('/').pop();
                    if (entryName && entryName.includes(searchPattern) && currentFullPath !== startPath) {
                        results.push(currentFullPath);
                    } else if (currentFullPath === startPath && startPath.split('/').pop().includes(searchPattern)) {
                        // Špeciálny prípad pre samotný počiatočný adresár, ak sa zhoduje so vzorkou
                        results.push(currentFullPath);
                    }

                    if (currentEntry.type === 'dir') {
                        // Vyhľadávať podadresáre
                        for (const key in currentEntry) {
                            if (key !== 'type' && key !== 'files' && currentEntry[key].type === 'dir') {
                                const newPath = `${currentFullPath === '/' ? '' : currentFullPath}/${key}`;
                                search(currentEntry[key], newPath);
                            }
                        }
                        // Vyhľadávať súbory v tomto adresári
                        if (currentEntry.files) {
                            for (const filename in currentEntry.files) {
                                if (filename.includes(searchPattern)) {
                                    results.push(`${currentFullPath === '/' ? '' : currentFullPath}/${filename}`);
                                }
                            }
                        }
                    }
                }

                search(startDirEntry, startPath); // Spustiť vyhľadávanie z počiatočného adresára

                if (results.length > 0) {
                    typeOutput(results.join('\n'));
                } else {
                    typeOutput(''); // Ak sa nenájdu žiadne výsledky, vypíše prázdny riadok
                }
            }
        },
        'head': {
            desc: 'Output the first part of files.',
            execute: (args) => {
                let numLines = 10; // Predvolené
                let filePathArg = null;

                // Parsujte argumenty pre -n a cestu k súboru
                if (args.length === 1 && !args[0].startsWith('-n')) {
                    filePathArg = args[0]; // Iba názov súboru
                } else if (args.length === 2 && args[0].startsWith('-n')) {
                    const nValue = parseInt(args[0].substring(2), 10);
                    if (!isNaN(nValue) && nValue >= 0) {
                        numLines = nValue;
                        filePathArg = args[1];
                    } else {
                        return typeOutput("head: invalid number of lines: '" + args[0].substring(2) + "'");
                    }
                } else if (args.length === 2 && args[0] === '-n') {
                    const nValue = parseInt(args[1], 10);
                    if (!isNaN(nValue) && nValue >= 0) {
                        numLines = nValue;
                        filePathArg = args[2]; // Toto bude nedefinované, spracujte nižšie
                    } else {
                        return typeOutput("head: invalid number of lines: '" + args[1] + "'");
                    }
                } else if (args.length === 3 && args[0] === '-n') {
                        const nValue = parseInt(args[1], 10);
                        if (!isNaN(nValue) && nValue >= 0) {
                            numLines = nValue;
                            filePathArg = args[2];
                        } else {
                            return typeOutput("head: invalid number of lines: '" + args[1] + "'");
                        }
                } else {
                    return typeOutput("Usage: head [-n num_lines] [file]");
                }

                if (!filePathArg) return typeOutput("Usage: head [-n num_lines] [file]");

                const fs = getFS();
                const fileEntry = getFileEntry(fs, filePathArg);

                if (!fileEntry) {
                    return typeOutput(`head: ${filePathArg}: No such file or directory`);
                }

                const lines = fileEntry.file.content.split('\n');
                const outputLines = lines.slice(0, numLines);
                typeOutput(outputLines.join('\n'));
            }
        },
        'tail': {
            desc: 'Output the last part of files.',
            execute: (args) => {
                let numLines = 10; // Predvolené
                let filePathArg = null;

                // Parsujte argumenty pre -n a cestu k súboru
                if (args.length === 1 && !args[0].startsWith('-n')) {
                    filePathArg = args[0]; // Iba názov súboru
                } else if (args.length === 2 && args[0].startsWith('-n')) {
                    const nValue = parseInt(args[0].substring(2), 10);
                    if (!isNaN(nValue) && nValue >= 0) {
                        numLines = nValue;
                        filePathArg = args[1];
                    } else {
                        return typeOutput("tail: invalid number of lines: '" + args[0].substring(2) + "'");
                    }
                } else if (args.length === 2 && args[0] === '-n') {
                    const nValue = parseInt(args[1], 10);
                    if (!isNaN(nValue) && nValue >= 0) {
                        numLines = nValue;
                        filePathArg = args[2]; // Toto bude nedefinované, spracujte nižšie
                    } else {
                        return typeOutput("tail: invalid number of lines: '" + args[1] + "'");
                    }
                } else if (args.length === 3 && args[0] === '-n') {
                        const nValue = parseInt(args[1], 10);
                        if (!isNaN(nValue) && nValue >= 0) {
                            numLines = nValue;
                            filePathArg = args[2];
                        } else {
                            return typeOutput("tail: invalid number of lines: '" + args[1] + "'");
                        }
                } else {
                    return typeOutput("Usage: tail [-n num_lines] [file]");
                }

                if (!filePathArg) return typeOutput("Usage: tail [-n num_lines] [file]");

                const fs = getFS();
                const fileEntry = getFileEntry(fs, filePathArg);

                if (!fileEntry) {
                    return typeOutput(`tail: ${filePathArg}: No such file or directory`);
                }

                const lines = fileEntry.file.content.split('\n');
                const outputLines = lines.slice(-numLines); // Získajte posledných N riadkov
                typeOutput(outputLines.join('\n'));
            }
        },
        'wc': {
            desc: 'Print newline, word, and byte counts for a file.',
            execute: (args) => {
                if (!args.length) return typeOutput("Usage: wc [file]");

                const filePathArg = args[0];
                const fs = getFS();
                const fileEntry = getFileEntry(fs, filePathArg);

                if (!fileEntry) {
                    return typeOutput(`wc: ${filePathArg}: No such file or directory`);
                }

                const content = fileEntry.file.content;
                // Počet riadkov: počet znakov '\n'. Ak súbor nekončí novým riadkom, je to o jeden menej.
                // Jednoduché split('\n') vyústi v N+1 prvkov pre N nových riadkov.
                const lines = content.split('\n').length - (content.endsWith('\n') ? 0 : 1); 
                const words = content.split(/\s+/).filter(word => word.length > 0).length; // Rozdeliť podľa jedného alebo viacerých bielych znakov, filtrovať prázdne reťazce
                const chars = content.length; // Počet znakov zahŕňa nové riadky

                // Výstup v štandardnom formáte wc: riadky slová znaky názov_súboru
                typeOutput(`${lines}\t${words}\t${chars} ${filePathArg}`);
            }
        },
        'chmod': {
            desc: 'Change file mode bits (permissions). Accepts octal notation (e.g., 755).',
            execute: (args) => {
                if (args.length !== 2) return typeOutput("Usage: chmod [octal_permissions] [file/directory]");

                const octalPerms = args[0];
                const targetPathArg = args[1];

                if (!/^[0-7]{3}$/.test(octalPerms)) {
                    return typeOutput(`chmod: invalid mode: '${octalPerms}' (expected 3 octal digits, e.g., 755)`);
                }

                const fs = getFS();
                const resolved = resolvePathToParent(fs, targetPathArg);

                if (!resolved || !resolved.exists) {
                    return typeOutput(`chmod: cannot access '${targetPathArg}': No such file or directory`);
                }

                const symbolicPerms = octalToSymbolic(octalPerms);

                if (resolved.isFile) {
                    resolved.entry.permissions = symbolicPerms;
                    typeOutput(`Permissions for file '${targetPathArg}' changed to ${symbolicPerms}`);
                } else if (resolved.isDir) {
                    resolved.entry.permissions = symbolicPerms;
                    typeOutput(`Permissions for directory '${targetPathArg}' changed to ${symbolicPerms}`);
                }
                saveFS(fs);
            }
        },
        'grep': {
            desc: 'Print lines matching a pattern.',
            execute: (args) => {
                if (args.length < 2) return typeOutput("Usage: grep [pattern] [file]");
                
                const pattern = args[0];
                const filePathArg = args[1];
                const fs = getFS();
                const fileEntry = getFileEntry(fs, filePathArg);

                if (!fileEntry) {
                    return typeOutput(`grep: ${filePathArg}: No such file or directory`);
                }

                const lines = fileEntry.file.content.split('\n');
                let matchedLines = [];
                for (const line of lines) {
                    if (line.includes(pattern)) {
                        matchedLines.push(line);
                    }
                }

                if (matchedLines.length > 0) {
                    typeOutput(matchedLines.join('\n'));
                } else {
                    // Žiadne zhody, vypíšte nič (štandardné správanie grep)
                    typeOutput('');
                }
            }
        },
        'clear_history': {
            desc: 'Clear the command history.',
            execute: () => {
                commandHistory = [];
                historyIndex = -1;
                typeOutput("Command history cleared.");
            }
        },
        'clear_fs': {
            desc: 'Reset the entire file system in localStorage to its initial state.',
            execute: () => {
                localStorage.removeItem('linux_fs'); // Odstrániť existujúci FS
                initFileSystem(); // Znovu inicializovať na predvolený stav
                currentDir = '/home/user'; // Resetovať aktuálny adresár
                updatePrompt();
                typeOutput("File system has been reset to its initial state.");
                typeOutput("You might want to type 'clear' to clear the screen.");
            }
        }
    };

    // --- Funkcie aktualizácie UI ---

    /**
     * Aktualizuje prompt terminálu na základe aktuálneho užívateľa a adresára.
     */
    function updatePrompt() {
        const displayDir = currentDir === '/home/user' ? '~' : currentDir;
        document.getElementById('cli-prompt').textContent = 
            `${currentUser}@browser:${displayDir}$`;
    }

    /**
     * Vypíše text do cli-output s efektom písania.
     * @param {string} text - Text na zobrazenie.
     * @param {function} [callback] - Voliteľná callback funkcia, ktorá sa vykoná po písaní.
     */
    function typeOutput(text, callback) {
        const lines = text.split('\n');
        let currentLine = 0;
        
        function typeLine() {
            if (currentLine >= lines.length) {
                cliOutput.scrollTop = cliOutput.scrollHeight; // Posunúť na spodok
                return callback && callback();
            }
            
            const line = lines[currentLine];
            const p = document.createElement('p');
            // Skontrolujte, či riadok obsahuje HTML (napr. z príkazu ls -l s farbami)
            if (line.includes('<span style=')) {
                p.innerHTML = line; // Použite innerHTML na vykreslenie HTML tagov
                cliOutput.appendChild(p);
                currentLine++;
                setTimeout(typeLine, 50); // Rýchly prechod na ďalší riadok pre preformátovaný výstup
                return;
            }

            cliOutput.appendChild(p);
            
            // Spracovanie prázdnych riadkov bez efektu písania
            if (line.trim() === '') {
                currentLine++;
                setTimeout(typeLine, 50);
                return;
            }
            
            let i = 0;
            const typingInterval = setInterval(() => {
                if (i < line.length) {
                    p.textContent += line.charAt(i);
                    i++;
                    cliOutput.scrollTop = cliOutput.scrollHeight; // Zostať posunutý na spodok
                } else {
                    clearInterval(typingInterval);
                    currentLine++;
                    setTimeout(typeLine, 100); // Krátke oneskorenie pred písaním ďalšieho riadku
                }
            }, 20); // Rýchlosť písania
        }
        
        typeLine(); // Spustite animáciu písania
    }

    // --- Spracovanie príkazov a poslucháči udalostí ---

    /**
     * Spracuje príkaz zadaný užívateľom.
     * Táto funkcia je nastavená ako globálna, aby bola prístupná prepísaním príkazu 'edit'.
     * @param {string} command - Reťazec príkazu na spracovanie.
     */
    window.processCommand = function(command) {
        // Pridať do histórie, ak nie je prázdna
        if (command.trim() !== '') {
            commandHistory.push(command);
            historyIndex = commandHistory.length; // Resetovať index histórie na koniec
        }
        
        // Zobraziť zadaný príkaz s promptom
        const p = document.createElement('p');
        p.innerHTML = `<span style="color:#48bb78">${currentUser}@browser:${currentDir === '/home/user' ? '~' : currentDir}$</span> ${command}`;
        cliOutput.appendChild(p);
        
        const parts = command.split(' ');
        const cmd = parts[0];
        const args = parts.slice(1);

        // Špeciálne spracovanie pre `history -c`, pretože to nie je samostatný príkaz
        if (cmd === 'history' && args[0] === '-c') {
            commands['history'].execute(args);
            cliOutput.scrollTop = cliOutput.scrollHeight;
            return;
        }
        
        // Vykonajte príkaz, ak existuje, inak zobrazte 'príkaz nenájdený'
        if (commands[cmd]) {
            commands[cmd].execute(args);
        } else {
            typeOutput(`${cmd}: command not found. Type 'help' for available commands.`);
        }
        
        cliOutput.scrollTop = cliOutput.scrollHeight; // Zabezpečte, aby sa výstup posunul na spodok
    };

    // Poslucháč udalostí pre vstupné pole (Enter, šípka hore/dole pre históriu)
    cliInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const command = this.value.trim();
            if (command) window.processCommand(command); // Použite globálnu funkciu processCommand
            this.value = ''; // Vymazať vstupné pole
        } else if (e.key === 'ArrowUp') {
            // Navigácia nahor v histórii príkazov
            if (commandHistory.length > 0 && historyIndex > 0) {
                historyIndex--;
                this.value = commandHistory[historyIndex];
                e.preventDefault(); // Zabrániť pohybu kurzora
            }
        } else if (e.key === 'ArrowDown') {
            // Navigácia nadol v histórii príkazov
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                this.value = commandHistory[historyIndex];
                e.preventDefault(); // Zabrániť pohybu kurzora
            } else {
                // Ak je na konci histórie, vymažte vstup
                historyIndex = commandHistory.length;
                this.value = '';
                e.preventDefault();
            }
        }
    });
    
    // Počiatočná uvítacia správa a nastavenie promptu po krátkom oneskorení
    setTimeout(() => {
        typeOutput("Linux Terminal Emulator v2.0 (Browser Edition)");
        typeOutput("All data is stored only in your browser's localStorage.");
        typeOutput("To reset the file system, type 'clear_fs'.");
        typeOutput("Type 'help' to see available commands.", updatePrompt); // Zavolajte updatePrompt po písaní
    }, 500);
});
