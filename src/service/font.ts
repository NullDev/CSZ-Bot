import { GlobalFonts } from "@napi-rs/canvas";

export const names = {
    dbNeoBlack: "DBNeoScreenSans Black",
    dbNeoBold: "DBNeoScreenSans Bold",
    dbNeoRegular: "DBNeoScreenSans Regular",
    openSans: "Open Sans",
    appleEmoji: "Apple Emoji",
};

GlobalFonts.registerFromPath("assets/fonts/DBNeoScreenSans-Black.woff2", names.dbNeoBlack);
GlobalFonts.registerFromPath("assets/fonts/DBNeoScreenSans-Bold.woff2", names.dbNeoBold);
GlobalFonts.registerFromPath("assets/fonts/DBNeoScreenSans-Regular.woff2", names.dbNeoRegular);
GlobalFonts.registerFromPath("assets/fonts/OpenSans-VariableFont_wdth,wght.ttf", names.openSans);
GlobalFonts.registerFromPath("assets/fonts/AppleColorEmoji@2x.ttf", names.appleEmoji);
