import { 
  MapPin, Briefcase, GraduationCap, Heart, Star, 
  Mail, Phone, Globe, Calendar, Code, Coffee, 
  Music, Camera, Book, Zap, Award, Smile
} from "lucide-react";

export const PROFILE_ICONS = [
  { id: "mappin", name: "位置 (Location)", icon: MapPin },
  { id: "briefcase", name: "工作 (Work)", icon: Briefcase },
  { id: "graduationcap", name: "教育 (Education)", icon: GraduationCap },
  { id: "heart", name: "爱好 (Hobby)", icon: Heart },
  { id: "star", name: "成就 (Achievement)", icon: Star },
  { id: "mail", name: "邮箱 (Email)", icon: Mail },
  { id: "phone", name: "电话 (Phone)", icon: Phone },
  { id: "globe", name: "网站 (Website)", icon: Globe },
  { id: "calendar", name: "日期 (Date)", icon: Calendar },
  { id: "code", name: "技能 (Skill)", icon: Code },
  { id: "coffee", name: "咖啡 (Coffee)", icon: Coffee },
  { id: "music", name: "音乐 (Music)", icon: Music },
  { id: "camera", name: "摄影 (Photography)", icon: Camera },
  { id: "book", name: "阅读 (Reading)", icon: Book },
  { id: "zap", name: "能量 (Energy)", icon: Zap },
  { id: "award", name: "奖项 (Award)", icon: Award },
  { id: "smile", name: "状态 (Status)", icon: Smile },
];

export function getProfileIcon(id: string) {
  const found = PROFILE_ICONS.find(p => p.id === id);
  return found ? found.icon : Star;
}
