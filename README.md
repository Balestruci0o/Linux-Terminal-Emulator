Linux Terminal Emulator (Prehliadačová Verzia)
Vitajte v Linux Terminal Emulátore, interaktívnej webovej aplikácii, ktorá simuluje základné funkcie Linuxového terminálu priamo vo vašom prehliadači! Tento projekt slúži ako ukážka emulácie súborového systému, spracovania príkazov a základnej interakcie s príkazovým riadkom pomocou čistého HTML, CSS (TailwindCSS) a JavaScriptu.

Všetky vytvorené súbory a adresáre sú perzistentne uložené vo vašom prehliadači pomocou localStorage, čo vám umožňuje pokračovať tam, kde ste prestali.

💡 O Projekte
Tento terminálový emulátor bol vytvorený s cieľom poskytnúť realistický, no zároveň bezpečný a jednoducho nasaditeľný zážitok z príkazového riadku. Je to vynikajúci projekt pre portfólio, ktorý demonštruje schopnosť vytvárať komplexné front-end aplikácie s perzistentným úložiskom a interaktívnou logikou. Každý príkaz je implementovaný tak, aby sa čo najviac podobal svojmu náprotivku v reálnom Linuxe, čím ponúka užívateľom intuitívne a funkčné prostredie.

✨ Kľúčové Vlastnosti
Emulácia Príkazového Riadku: Interaktívny terminál s dynamickým výstupom a efektom písania.

Perzistentný Súborový Systém: Vytvárajte, upravujte a spravujte súbory a adresáre, ktoré prežijú obnovenie stránky vďaka localStorage.

Rozsiahla Podpora Príkazov Linuxu: Implementovaná široká škála bežných príkazov vrátane ls (s -l), cd, mkdir, rm (s -r), cp (s -r), mv, cat, grep, find, head, tail, wc, chmod a ďalšie.

História Príkazov: Jednoduchá navigácia v histórii zadaných príkazov pomocou šípok hore/dole a možnosť vymazania histórie (history -c).

Simulované Oprávnenia: Základná implementácia chmod pre zmenu oprávnení súborov a adresárov, viditeľná vo výstupe ls -l.

Intuitívny UI/UX: Minimalistický, tmavý dizajn inšpirovaný terminálom s dôrazom na čitateľnosť a plynulú interakciu.

🚀 Ako Začať
Stiahnite a otvorte:
Stiahnite si súbor index.html z tohto repozitára.
Jednoducho otvorte súbor index.html vo vašom preferovanom webovom prehliadači.

Resetujte súborový systém (voliteľné, ale odporúčané pri prvej inštalácii):
Ak chcete zabezpečiť, že súborový systém je správne inicializovaný na najnovšiu verziu, zadajte do terminálu:

clear_fs
clear

📋 Dostupné Príkazy
Tu je zoznam príkazov, ktoré sú v súčasnosti implementované:

Príkaz

Popis

Použitie

help

Zobrazí informácie o dostupných príkazoch.

help

ls

Vypíše obsah adresára.

ls [adresár] 
 ls -l [adresár] (dlhý formát)

cat

Spojí a zobraziť obsah súboru.

cat [súbor]

cd

Zmení aktuálny adresár.

cd [adresár]

pwd

Vypíše názov aktuálneho pracovného adresára.

pwd

mkdir

Vytvorí adresáre.

mkdir [adresár]

touch

Zmení časové pečiatky súboru. Vytvorí súbor, ak neexistuje.

touch [súbor]

edit

Upraví obsah súboru v režime viacerých riadkov.

edit [názov_súboru] (uložte zadaním EOF na nový riadok)

rm

Odstráni súbory alebo adresáre.

rm [súbor/adresár] 
 rm -r [adresár] (rekurzívne odstránenie)

rmdir

Odstráni prázdne adresáre.

rmdir [adresár]

mv

Presunie alebo premenuje súbory/adresáre.

mv [zdroj] [cieľ] 
 mv [zdroj1] [zdroj2...] [adresár]

cp

Kopíruje súbory alebo adresáre.

cp [zdroj_súbor] [cieľový_súbor_alebo_adresár] 
 cp -r [zdroj_adresár] [cieľový_adresár] 
 cp [-r] [zdroj1] [zdroj2...] [adresár]

echo

Zobrazí riadok textu.

echo [text...]

clear

Vyčistí obrazovku terminálu.

clear

whoami

Vypíše efektívne ID užívateľa.

whoami

date

Vypíše alebo nastaví systémový dátum a čas.

date

history

Zobrazí alebo manipuluje so zoznamom histórie.

history 
 history -c (vymaže históriu)

man

Zobrazí manuálovú stránku pre príkaz.

man [príkaz]                                                              Môžete tiež pridať obrázky vo formáte ![Popis obrázku](cesta/k/vášmu/obrázku.png) a video vo formáte ![Popis videa](cesta/k/vášmu/videu.mp4).

uname

Vypíše systémové informácie.

uname

find

Vyhľadá súbory v hierarchii adresárov.

find [cesta] -name [vzorka]

head

Vypíše prvú časť súborov.

head [-n počet_riadkov] [súbor]

tail

Vypíše poslednú časť súborov.

tail [-n počet_riadkov] [súbor]

wc

Vypíše počet riadkov, slov a bajtov pre súbor.

wc [súbor]

chmod

Zmení bitové režimy súboru (oprávnenia) v osmičkovej notácii.

chmod [osmičkové_oprávnenia] [súbor/adresár] 
 Príklad: chmod 755 myfile.sh

grep

Vypíše riadky zodpovedajúce vzorke v súbore.

grep [vzorka] [súbor]

clear_history

Vyčistí históriu príkazov.

clear_history

clear_fs

Resetuje celý súborový systém v localStorage do počiatočného stavu.

clear_fs

🗂️ Štruktúra Súborového Systému
Simulovaný súborový systém je hierarchicky štruktúrovaný a uložený lokálne vo vašom prehliadači pomocou localStorage. To znamená, že všetky vaše vytvorené súbory a adresáre zostanú zachované aj po zatvorení prehliadača, kým manuálne nevymažete dáta stránky alebo nepoužijete príkaz clear_fs.

Počiatočná štruktúra obsahuje:

/
├── bin/
├── home/
│   └── user/
│       ├── .bashrc
│       ├── welcome.txt
│       └── notes.txt
└── tmp/

🖼️ Vizuálna Prezentácia
Pozrite sa, ako tento terminálový emulátor vyzerá a funguje! Odporúčame nahrať snímky obrazovky alebo GIF, ktoré predvedú kľúčové funkcie.


Ukážka terminálu po načítaní s uvítacou správou.


Zobrazenie podrobného výstupu príkazu ls -l s farebným zvýraznením adresárov.


Krátka animovaná ukážka vytvárania, presúvania a odstraňovania súborov/adresárov.

🛠️ Technológie
HTML5: Pre štruktúru webovej stránky.

CSS3: Základné štýly a prispôsobenie (používa Tailwind CSS prostredníctvom CDN).

JavaScript (ES6+): Pre logiku terminálu, manipuláciu so súborovým systémom a dynamickú interakciu.

localStorage: Na zabezpečenie perzistencie dát súborového systému.

💡 Budúce Rozšírenia
Podpora pre pipe (|) a presmerovanie (>, >>).

Implementácia používateľov a skupín (len simulovaná).

Vylepšenie regulárnych výrazov pre grep a find.

Zložitejšie simulácie procesov (ps, top).

Pridanie textového editora vim (zjednodušená verzia).

Integrácia s API pre simulované "sieťové" príkazy (napr. curl na statický JSON).

🤝 Prispievanie
Ak máte nápady na vylepšenia alebo chcete prispieť, neváhajte otvoriť issue alebo poslať pull request!

📄 Licencia
Tento projekt je licencovaný pod licenciou MIT. Podrobnosti nájdete v súbore LICENSE.

Vytvorené s vášňou a kávou! ☕
