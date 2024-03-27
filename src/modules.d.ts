// Doesn't ship with own types: https://www.npmjs.com/package/instagram-url-direct
declare module "instagram-url-direct" {
    export default function (url: string): Promise<InstagramResult>;
    export interface InstagramResult {
        url_list: string[];
    }
}
