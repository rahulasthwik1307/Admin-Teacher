import fs from 'fs';

const dashPath = 'E:/Attendance/lib/screens/dashboard/dashboard_screen.dart';
let dashContent = fs.readFileSync(dashPath, 'utf8');
const targetStr = "(r) => r['status'] == 'present' && (r['face_verified'] == true)";
const replacementStr = "(r) => r['status'] == 'present'";

const dashOccurrences = dashContent.split(targetStr).length - 1;
console.log(`Found ${dashOccurrences} occurrences in dashboard_screen.dart`);
dashContent = dashContent.replaceAll(targetStr, replacementStr);
fs.writeFileSync(dashPath, dashContent, 'utf8');

const profPath = 'E:/Attendance/lib/screens/dashboard/profile_screen.dart';
let profContent = fs.readFileSync(profPath, 'utf8');
const profOccurrences = profContent.split(targetStr).length - 1;
console.log(`Found ${profOccurrences} occurrences in profile_screen.dart`);
profContent = profContent.replaceAll(targetStr, replacementStr);
fs.writeFileSync(profPath, profContent, 'utf8');

console.log('Successfully updated Flutter dashboard and profile screens!');
