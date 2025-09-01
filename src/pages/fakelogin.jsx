import { useState } from "react";
import {Mail,Lock,Eye,EyeOff} from "lucide-react";
import { div } from "three/tsl";

export default function login(){
    const [showPassword,SetShowPassword] = useState(false);
return(
    <div className="bg-purple-500 flex justify-center align-items min-h-screen">
        <div className="bg-blue-500 p-8 rounded-2xl shadow-lg w-96">
            {/* logo */}
            <div className="flex justify-center mb-6">
                <image></image>
            </div>
            {/* heading */}
            <div className="">Autofy-Login</div>
        </div>
    </div>
    
);
}