"use client";

import { useState } from "react";
import { UploadCloud, ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/i18n/LanguageProvider";

const LOCATION_DATA = {
  USA: { currency: "USD", symbol: "$", cities: ["New York","Los Angeles","Miami","Chicago"] },
  UAE: { currency: "AED", symbol: "د.إ", cities: ["Dubai","Abu Dhabi","Sharjah"] },
  UK: { currency: "GBP", symbol: "£", cities: ["London","Manchester","Birmingham"] },
  Egypt: { currency: "EGP", symbol: "E£", cities: ["Cairo","Alexandria","Giza"] },
  "Saudi Arabia": { currency: "SAR", symbol: "ر.س", cities: ["Riyadh","Jeddah","Mecca"] },
};

type CountryKey = keyof typeof LOCATION_DATA;

export default function UploadPage() {

const { t } = useTranslation();
const router = useRouter();

const [videoFile,setVideoFile] = useState<File|null>(null);
const [thumbnail,setThumbnail] = useState<File|null>(null);
const [uploading,setUploading] = useState(false);

const [selectedCountry,setSelectedCountry] = useState<CountryKey | "">("");
const [selectedCity,setSelectedCity] = useState("");

const availableCities = selectedCountry ? LOCATION_DATA[selectedCountry].cities : [];
const currencySymbol = selectedCountry ? LOCATION_DATA[selectedCountry].symbol : "$";

const handleVideoChange = (e:any)=>{
if(e.target.files[0]) setVideoFile(e.target.files[0]);
}

const handleThumbnailChange = (e:any)=>{
if(e.target.files[0]) setThumbnail(e.target.files[0]);
}

const handleSubmit = async(e:any)=>{
e.preventDefault();

if(!videoFile){
alert("Please choose video");
return;
}

setUploading(true);

try{

const videoData = new FormData();
videoData.append("file",videoFile);
videoData.append("upload_preset","real-estate");

const videoUpload = await fetch(
"https://api.cloudinary.com/v1_1/dcppbps4n/video/upload",
{
method:"POST",
body:videoData
});

const videoRes = await videoUpload.json();
const videoUrl = videoRes.secure_url;

let thumbnailUrl = "";

if(thumbnail){

const imageData = new FormData();
imageData.append("file",thumbnail);
imageData.append("upload_preset","real-estate");

const imgUpload = await fetch(
"https://api.cloudinary.com/v1_1/dcppbps4n/image/upload",
{
method:"POST",
body:imageData
});

const imgRes = await imgUpload.json();
thumbnailUrl = imgRes.secure_url;

}

const formData = new FormData(e.target);

const payload = {

title: formData.get("title"),
description: formData.get("description"),
price: formData.get("price"),
bedrooms: formData.get("bedrooms"),
bathrooms: formData.get("bathrooms"),
sizeSqm: formData.get("sizeSqm"),

country:selectedCountry,
city:selectedCity,
area:formData.get("area"),

videoUrl,
thumbnailUrl

};

await fetch("/api/video/upload",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify(payload)
});

alert("Property uploaded successfully");

router.push("/");

}catch(err){

console.error(err);
alert("Upload failed");

}

setUploading(false);

};

return (

<div className="max-w-4xl mx-auto p-8 text-white">

<h1 className="text-3xl font-bold mb-6">
{t("upload","title")}
</h1>

<form onSubmit={handleSubmit} className="space-y-8">

{/* VIDEO */}

<div>

<label className="block mb-2 font-semibold">
Video
</label>

<label className="border-2 border-dashed border-gray-600 p-10 block text-center rounded-xl cursor-pointer hover:border-blue-500">

<UploadCloud className="mx-auto mb-3"/>

<p>Click to upload video</p>

<input
type="file"
accept="video/*"
onChange={handleVideoChange}
className="hidden"
/>

</label>

{videoFile && <p className="text-green-400 mt-2">{videoFile.name}</p>}

</div>

{/* THUMBNAIL */}

<div>

<label className="block mb-2 font-semibold">
Thumbnail
</label>

<label className="border-2 border-dashed border-gray-600 p-10 block text-center rounded-xl cursor-pointer hover:border-blue-500">

<ImageIcon className="mx-auto mb-3"/>

<p>Click to upload thumbnail</p>

<input
type="file"
accept="image/*"
onChange={handleThumbnailChange}
className="hidden"
/>

</label>

{thumbnail && <p className="text-green-400 mt-2">{thumbnail.name}</p>}

</div>

{/* TITLE */}

<div>

<label className="block mb-2">
{t("upload","videoTitle")}
</label>

<input
name="title"
required
className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3"
/>

</div>

{/* DESCRIPTION */}

<div>

<label className="block mb-2">
{t("upload","description")}
</label>

<textarea
name="description"
rows={4}
className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3"
/>

</div>

{/* SPECS */}

<div className="grid grid-cols-2 md:grid-cols-4 gap-4">

<input name="bedrooms" placeholder="Bedrooms" className="bg-gray-900 p-3 rounded"/>
<input name="bathrooms" placeholder="Bathrooms" className="bg-gray-900 p-3 rounded"/>
<input name="sizeSqm" placeholder="Size m²" className="bg-gray-900 p-3 rounded"/>

<div className="relative">

<span className="absolute left-3 top-3 text-gray-400">
{currencySymbol}
</span>

<input
name="price"
required
className="pl-7 bg-gray-900 p-3 rounded w-full"
/>

</div>

</div>

{/* LOCATION */}

<div className="grid md:grid-cols-3 gap-4">

<select
required
value={selectedCountry}
onChange={(e)=>{
setSelectedCountry(e.target.value as CountryKey);
setSelectedCity("");
}}
className="bg-gray-900 p-3 rounded"
>

<option value="">
Select Country
</option>

{Object.keys(LOCATION_DATA).map(c=>(
<option key={c} value={c}>
{c}
</option>
))}

</select>

<select
required
value={selectedCity}
onChange={(e)=>setSelectedCity(e.target.value)}
className="bg-gray-900 p-3 rounded"
>

<option value="">
Select City
</option>

{availableCities.map(city=>(
<option key={city}>
{city}
</option>
))}

</select>

<input
name="area"
placeholder="Neighborhood"
className="bg-gray-900 p-3 rounded"
/>

</div>

<button
type="submit"
disabled={uploading}
className="bg-blue-600 px-8 py-3 rounded-lg font-bold"
>

{uploading ? "Uploading..." : t("upload","submit")}

</button>

</form>

</div>

);
}