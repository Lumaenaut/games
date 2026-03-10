# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Keep line number and source file info for readable stack traces in Play Console.
-keepattributes SourceFile,LineNumberTable

# GameType enum is passed by name in navigation arguments (Bundle); valueOf(name) and name() must work.
-keepclassmembers class com.lumaenaut.secondrunner.GameType {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}
