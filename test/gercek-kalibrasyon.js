'use strict';

const fs = require('fs');
const { magazadanIndir } = require('../src/store');
const { analizEt } = require('../src/analyze');

const ADAYLAR = [
  ['My Doodle', 'acnonhmkejidodnppipkffhfjbfiogha'],
  ['Full Page Screenshot', 'ijidfpoenjmfdabnmchmdoopghmjnjij'],
  ['Screen Capture & Editor', 'ieplcgpmefghbhilagpemdpjekaadpnc'],
  ['Volume Master', 'jghecgabfgfdldnmbfkhmffcabddioke'],
  ['Free VPN for Chrome', 'majdfhpaihoncoakbjgbdhglocklcgno'],
  ['AdBlock', 'gighmmpiobklfepjocnamgkkbiglidom'],
  ['Ad Block Ninja', 'ppfadpgpccljindldolejmgkhgaficka'],
  ['Adblock Star', 'ajmiofkgebokdfiicngpgiajiokbcded'],
  ['All-In-One Adblocker', 'okockappikfndbdfphjklenhfpdlgkgi'],
  ['Color Picker For Chrome', 'clldacgmdnnanihiibdgemajcfkmfhia'],
  ['Colorzilla', 'bhlhnicpbhignbdhedgjhgdocnmhomnp'],
  ['Easy Color Picker', 'bgahcehknhgmjoggmkibghafppcfoaci'],
  ['Online Notepad', 'gjfbebipmmehllpcoieochgkopadmddh'],
  ['Notepadd Notepad Offline', 'figjbccglkomddphmlocjcieomchginb'],
  ['Side Notepad Notes Note T', 'jnajbdnopbhnfjjhkpichjdbfobeokjh'],
  ['What Is My Screen Resolut', 'odpgppmgiahoicodgkpmclebdbnbfcnc'],
  ['My Screen Resolution', 'jmflfibpbdmofgdboedoabhceknlopac'],
  ['Screen Resolution Size De', 'miahhdkfkecheoamdejpmjfpbjbomdig'],
  ['Page Load Time', 'fploionmjgeclbkemipmkogoaohcdbig'],
  ['Page Load Timer', 'bhklhaccecniahpolfcfjlhhnhogkfio'],
  ['Calculator Extension', 'bfnolignfekjbegbaobenmkhhkjifbcn'],
  ['Calculator', 'hcpbdjanfepobbkbnhmalalmfdmikmbe'],
  ['Scientific Calculator', 'fnplhdldnhaodknidfddmkfdhlhjihpd'],
  ['Wallpapers New Tab', 'cgaghnpgecpbcjclbggfboeplfkbodfk'],
  ['Vtoad New Tab Page Custom', 'gbmjiobljcegibeoleaompaihjijmfhg'],
  ['Wallsflow New Tab Live Wa', 'onablhclbgaihanifkenpggjkkgdpnkk'],
  ['Font Finder', 'bhiichidigehdgphoambhjbekalahgha'],
  ['Identify Font', 'adhnekcbcoikhjljbgickdcdpcjhdimc'],
  ['Dark Mode', 'dmghijelimhndkbmpgbldicpogfkceaj'],
  ['Dark Reader', 'eimadpbcbfnmbkopoojfekhnkhdbieeh'],
  ['Google Translate', 'aapbdbdomjkkjkaonfhkkikfgjllcleb'],
  ['Immersive Translate Ai We', 'bpoadfkcbjbfhfodiogcnhhhpibjhbnh'],
  ['Rss Feed Reader', 'pnjaodmkngahhkoihejjehlcdlnohgmp'],
  ['Inoreader Read Later And', 'kfimphpokifbjgmjflanmfeppcjimgah'],
  ['Bookmark Manager', 'idakfiahffeejfhghndaboolmmhbnepn'],
  ['Bookmark Manager And View', 'mnhojcjhcilkgkmijhphlbmghmmdhlfg'],
  ['Translate Translator Dict', 'mnlohknjofogcljbcknkakphddjpijak'],
  ['Translator Dictionary Acc', 'bebmphofpgkhclocdbgomhnjcpelbenh'],
  ['Definer Word Translator A', 'noagjioaihamoljcbelhdlldnmlgnkon'],
  ['Spell Checker For Chrome', 'jfpdnkkdgghlpdgldicfgnnnkhdfhocg'],
  ['Free Spell Checker For Go', 'ljgdcokhgjdpghmhdkbolccfcfdbklpo'],
  ['X Twitter Auto Cleaner', 'gpddblelbllagfcnhoadnfdbeanfmndi'],
  ['Clean Twitter', 'lbbfmkbgembfbohdadeggdcgdkmfdmpb'],
  ['Video Downloader Professi', 'elicpjhcidhpjomhibiffojpinpmmpil'],
  ['Video Download Helper', 'lmjnegcaeklhafolokijcfjliaokphfk'],
  ['Pdf Editor For Chromeedit', 'gphandlahdpffmccakmbngmbjnjiiahp'],
  ['Adobe Acrobat Pdf Edit Co', 'efaidnbmnnnibpcajpcglclefindmkaj'],
  ['Qr Code Generator', 'afpbjjgbdimpioenaedcjgkaigggcdpp'],
  ['The Qr Code Generator', 'oijdcdmnjjgnnhgljmhkjlablaejfeeb'],
  ['Rightinbox Email Reminder', 'mflnemhkomgploogccdmcloekbloobgb'],
  ['Gmail Follow Up Reminder', 'gdljfkmjgalnncjbhkgngmlpklbhlhnf'],
  ['Tab Manager By Workona', 'ailcmbgekjpnablpdkmaaccecekgdhlh'],
  ['Session Buddy Tab Bookmar', 'edacconmaakjimmfgnblocblbcdcpbko'],
  ['Coupert Automatic Coupon', 'mfidniedemcgceagapgdekdbmanojomk'],
  ['Shopilo Automatic Coupon', 'jfoanacamkbfibjbidbmeobmnndfgpca'],
  ['Price Tracker 20 Price Gr', 'khmkmdkfllphcbkbkgflononijbkdgff'],
  ['Keepa Amazon Price Tracke', 'neebplgakaahbhdphmkckjjcegoiijjo'],
  ['Ad Blocker Stands Adblock', 'lgblnfidahcdcjddiepkckcfdhpknnjh'],
  ['Parental Control Safe Bro', 'ggdoldplpieidgdofjpnakebdchiklgo'],
  ['Ai Parental Control', 'gkoiknfcddbjpadkeffgebenhngcgain'],
  ['Contentstudio Ai Social M', 'dmcddloohffhmjngiieikfifpfneadcc'],
  ['Post Planner For Social M', 'okdgcbphaejbolljolaeiaiocphhcnin'],
  ['Checker Plus For Gmail', 'oeopbcgkkoapgobdbedcemjljbihmemj'],
  ['Mailtrack Email Tracke', 'ndnaehgpjlnokgebbaldlmgkapkpjkkb'],
  ['Lastpass Free Password Ma', 'hdokiejnpimakedhajhdlcegeplioahd'],
  ['Keeper Password Manager', 'bfogiafebfohielmmehodmfbbebbbpei'],
  ['Bitwarden Password Manage', 'nngceckbapebfimnlniiiahkandclblb'],
  ['Browsec Vpn Free Vpn For', 'omghfjlpggmjjaagoclmmobgdodcjboh'],
  ['Free Vpn Proxy Vpn For Ch', 'jaoafpkngncfpfggjefnekilbkcpjdgp'],
  ['Getscreenme Remote Deskto', 'iaohfhfkcdddhmpmonkhhblodjfolfmf'],
  ['Devolutions Password Mana', 'neimonjjffhehnojilepgfejkneaidmo'],
  ['Chrome Remote Desktop', 'inomeogfingihgjfjlpeplalcfajhgai'],
  ['Tampermonkey', 'dhdgffkkebhmkfjojejmpbldmpobfkfo'],
  ['Scriptrunner V3 Userscrip', 'ljajhcdgkhcdfcpkcmppdjanbdegggbp'],
  ['Scriptcat', 'ndcooeababalnlpkfedmmbbbgkljhpjf'],
];

async function tekEklenti(isim, kimlik) {
  let dosyaYolu = null;
  try {
    const indirilen = await magazadanIndir(kimlik);
    dosyaYolu = indirilen.dosyaYolu;
    const r = await analizEt(dosyaYolu);
    return {
      isim,
      kimlik,
      basarili: true,
      not: r.sonuc.harf,
      olcek: r.sonuc.olcek,
      hamPuan: r.sonuc.hamPuan,
      dagilim: r.sonuc.dagilim,
    };
  } catch (hata) {
    return { isim, kimlik, basarili: false, hata: hata.message };
  } finally {
    if (dosyaYolu) {
      await fs.promises.rm(dosyaYolu, { force: true }).catch(() => { });
    }
  }
}

async function calistir() {
  console.log('\nGERÇEK EKLENTİ KALİBRASYONU');
  console.log('='.repeat(100));
  console.log(
    'EKLENTİ'.padEnd(24) + 'NOT'.padEnd(6) + 'ÖLÇEK'.padEnd(8) +
    'HAM'.padEnd(7) + 'host/izin/komb/kod/mnf'
  );
  console.log('-'.repeat(100));

  const sonuclar = [];

  for (const [isim, kimlik] of ADAYLAR) {
    const s = await tekEklenti(isim, kimlik);
    sonuclar.push(s);

    if (!s.basarili) {
      console.log(`${isim.padEnd(24)}HATA: ${s.hata}`);
      continue;
    }

    const d = s.dagilim;
    const dagilimMetni = `${d.hostErisimi}/${d.izinler}/${d.kombinasyonlar}/${d.kod}/${d.manifest}`;
    console.log(
      s.isim.padEnd(24) +
      s.not.padEnd(6) +
      String(s.olcek).padEnd(8) +
      String(s.hamPuan).padEnd(7) +
      dagilimMetni
    );
  }

  console.log('='.repeat(100));

  const basarililar = sonuclar.filter((s) => s.basarili);
  const dagitim = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const s of basarililar) dagitim[s.not]++;

  console.log(`\nBaşarılı: ${basarililar.length}/${sonuclar.length}`);
  console.log('Not dağılımı:', dagitim);

  if (basarililar.length) {
    const ortalama = basarililar.reduce((t, s) => t + s.olcek, 0) / basarililar.length;
    const siraliOlcekler = basarililar.map((s) => s.olcek).sort((a, b) => a - b);
    const medyan = siraliOlcekler[Math.floor(siraliOlcekler.length / 2)];
    console.log(`Ortalama ölçek: ${ortalama.toFixed(1)}  ·  Medyan: ${medyan}`);
  }
  console.log();
}

calistir();