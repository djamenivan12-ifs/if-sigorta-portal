import {submitReceipt} from "@/lib/insurance/submitReceipt";
export async function POST(request:Request){return submitReceipt(request,{reupload:true});}
