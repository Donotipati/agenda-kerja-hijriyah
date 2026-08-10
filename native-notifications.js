(function () {
  function plugin(){return window.Capacitor&&window.Capacitor.Plugins?window.Capacitor.Plugins.LocalNotifications||null:null;}
  function numericId(id){var str=String(id==null?"":id),h=2166136261;for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0)||1;}
  function asDate(v){if(!v)return null;var d=v instanceof Date?v:new Date(v);return isNaN(d.getTime())?null:d;}
  async function ensurePermission(){var ln=plugin();if(!ln)return false;var p=await ln.checkPermissions();if(p.display!=="granted")p=await ln.requestPermissions();return p.display==="granted";}
  // Android 12+ butuh izin terpisah buat "exact alarm" — tanpa ini notifikasi dijadwalkan tapi gak pernah dibunyikan sistem.
  async function ensureExactAlarmPermission(promptIfDenied){
    var ln=plugin();
    if(!ln || !ln.checkExactNotificationSetting) return true;
    try{
      var s = await ln.checkExactNotificationSetting();
      if(s && s.display==="granted") return true;
      if(promptIfDenied && ln.changeExactNotificationSetting){
        var s2 = await ln.changeExactNotificationSetting();
        return s2 && s2.display==="granted";
      }
      return false;
    }catch(e){ return true; }
  }
  async function schedule(id,title,body,date){var d=asDate(date),ln=plugin();if(!d||d.getTime()<=Date.now()||!ln)return false;if(!(await ensurePermission()))return false;await ln.schedule({notifications:[{id:numericId(id),title:title||"Agenda Kerja",body:body||"Ada agenda yang harus dikerjakan.",schedule:{at:d,allowWhileIdle:true},extra:{agendaId:String(id)}}]});return true;}
  async function cancel(id){var ln=plugin();if(!ln)return false;try{await ln.cancel({notifications:[{id:numericId(id)}]});return true;}catch(e){return false;}}
  async function reschedule(id,title,body,date){await cancel(id);return schedule(id,title,body,date);}
  window.AgendaNotifications={schedule:schedule,cancel:cancel,reschedule:reschedule,ensurePermission:ensurePermission,ensureExactAlarmPermission:ensureExactAlarmPermission,numericId:numericId};
})();
