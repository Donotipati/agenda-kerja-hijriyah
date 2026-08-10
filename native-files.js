(function () {
  function mediaStorePlugin(){return window.Capacitor&&window.Capacitor.Plugins?window.Capacitor.Plugins.MediaStoreSaver||null:null;}
  function sharePlugin(){return window.Capacitor&&window.Capacitor.Plugins?window.Capacitor.Plugins.Share||null:null;}
  function fsPlugin(){return window.Capacitor&&window.Capacitor.Plugins?window.Capacitor.Plugins.Filesystem||null:null;}
  function isNative(){return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());}

  var EASY_LOCATION = "Internal storage/Download/AgendaKerja";
  var FALLBACK_LOCATION = "Internal storage/Android/data/id.agendakerja.app/files/AgendaKerja";

  function blobToBase64(blob){
    return new Promise(function(resolve,reject){
      var reader = new FileReader();
      reader.onloadend = function(){
        var res = reader.result || "";
        var idx = res.indexOf(",");
        resolve(idx >= 0 ? res.substring(idx+1) : res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function browserDownload(filename, blob){
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
  }

  async function offerShare(uri, filename){
    var sh = sharePlugin();
    if(!sh || !uri) return;
    try{ await sh.share({ title: filename, url: uri, dialogTitle: "Bagikan file (opsional)" }); }
    catch(e){ /* dibatalkan user, gapapa - file sudah tersimpan */ }
  }

  // Simpan blob ke folder Download/AgendaKerja lewat MediaStore (cara resmi Android,
  // gak butuh izin apapun di Android 10+). Kalau plugin native belum ke-build / gagal,
  // fallback otomatis ke folder khusus app biar tetap ada yang tersimpan.
  async function saveOrShareBlob(filename, blob, opts){
    opts = opts || {};
    if(!isNative()){
      browserDownload(filename, blob);
      return { ok:true, mode:"browser" };
    }

    var base64 = await blobToBase64(blob);
    var mst = mediaStorePlugin();
    if(mst){
      try{
        var res = await mst.saveToDownloads({ filename: filename, mimeType: blob.type || "application/octet-stream", data: base64 });
        if(opts.offerShare !== false) await offerShare(res && res.uri, filename);
        return { ok:true, mode:"saved", easy:true, location: EASY_LOCATION };
      }catch(e){ /* lanjut ke fallback di bawah */ }
    }

    var fs = fsPlugin();
    if(fs){
      try{
        var relPath = "AgendaKerja/" + filename;
        var written = await fs.writeFile({ path: relPath, data: base64, directory: "EXTERNAL", recursive: true });
        if(opts.offerShare !== false) await offerShare(written && written.uri, filename);
        return { ok:true, mode:"saved", easy:false, location: FALLBACK_LOCATION };
      }catch(e2){
        try{ browserDownload(filename, blob); }catch(e3){}
        return { ok:false, error:(e2 && e2.message) || String(e2) };
      }
    }

    browserDownload(filename, blob);
    return { ok:true, mode:"browser" };
  }

  window.AgendaFiles = { saveOrShareBlob: saveOrShareBlob, EASY_LOCATION: EASY_LOCATION, FALLBACK_LOCATION: FALLBACK_LOCATION };
})();
