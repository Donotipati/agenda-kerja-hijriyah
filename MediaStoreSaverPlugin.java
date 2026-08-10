package id.agendakerja.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.OutputStream;

@CapacitorPlugin(name = "MediaStoreSaver")
public class MediaStoreSaverPlugin extends Plugin {

    @PluginMethod
    public void saveToDownloads(PluginCall call) {
        String filename = call.getString("filename");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        String base64Data = call.getString("data");

        if (filename == null || base64Data == null) {
            call.reject("filename dan data wajib diisi");
            return;
        }

        try {
            byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
            ContentResolver resolver = getContext().getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
            values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);

            Uri collection;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ : lewat MediaStore, tanpa izin tambahan sama sekali
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/AgendaKerja");
                collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
            } else {
                // Android 9 ke bawah : jalur lama, tetap didukung buat jaga-jaga
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "AgendaKerja");
                if (!dir.exists()) dir.mkdirs();
                values.put(MediaStore.MediaColumns.DATA, new File(dir, filename).getAbsolutePath());
                collection = MediaStore.Files.getContentUri("external");
            }

            Uri itemUri = resolver.insert(collection, values);
            if (itemUri == null) {
                call.reject("Gagal membuat entri file di folder Download");
                return;
            }

            OutputStream out = resolver.openOutputStream(itemUri);
            if (out == null) {
                call.reject("Gagal membuka file untuk ditulis");
                return;
            }
            out.write(bytes);
            out.flush();
            out.close();

            JSObject ret = new JSObject();
            ret.put("uri", itemUri.toString());
            ret.put("ok", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal menyimpan file: " + e.getMessage(), e);
        }
    }
}
