export const VS = `#version 300 es
precision highp float;
uniform vec2 uGrid;
uniform vec3 uPointer;
uniform vec4 uView;
uniform vec2 uShift;
uniform float uTime;
uniform float uAspect;
uniform float uViewportHeight;
out float vAlpha;
float hash12(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float valueNoise(vec2 p){
  vec2 cell=floor(p);vec2 l=fract(p);l=l*l*(3.0-2.0*l);
  float a=hash12(cell),b=hash12(cell+vec2(1.0,0.0)),c=hash12(cell+vec2(0.0,1.0)),d=hash12(cell+vec2(1.0,1.0));
  return mix(mix(a,b,l.x),mix(c,d,l.x),l.y);
}
void main(){
  float index=float(gl_VertexID);
  float row=floor(index/uGrid.x);
  float column=mod(index,uGrid.x);
  vec2 uv=vec2(column,row)/(uGrid-1.0);
  float x=(uv.x-0.5)*mix(119.0,218.0,uv.y);
  float z=mix(54.0,-119.0,pow(uv.y,1.12));
  float T=uTime;
  float broadNoise=valueNoise(vec2(x*0.075+T*0.34,z*0.082-T*0.29));
  float fineNoise=valueNoise(vec2(x*0.17-T*0.53,z*0.155+T*0.44));
  float detailNoise=valueNoise(vec2(x*0.31+z*0.08+T*0.67,z*0.27-x*0.065-T*0.58));
  float patchNoise=valueNoise(vec2(x*0.048+z*0.031+T*0.14,z*0.052-x*0.024-T*0.11));
  float crossPatch=valueNoise(vec2(-x*0.034+z*0.071-T*0.13,x*0.064+z*0.039+T*0.15));
  float finePatch=valueNoise(vec2(x*0.155+z*0.118+T*0.27,z*0.142-x*0.127-T*0.23));
  vec2 warped=vec2(
    x+(broadNoise-0.5)*4.4+(detailNoise-0.5)*1.5+(patchNoise-0.5)*4.8,
    z+(fineNoise-0.5)*3.8-(detailNoise-0.5)*1.6+(crossPatch-0.5)*4.6);
  float phaseA=warped.x*0.32+warped.y*0.16+T*1.16+(broadNoise-0.5)*1.0+(patchNoise-0.5)*2.7+(crossPatch-0.5)*1.25;
  float phaseB=-warped.x*0.21+warped.y*0.29-T*0.98+(fineNoise-0.5)*1.0+(crossPatch-0.5)*2.9+(finePatch-0.5)*1.25;
  float phaseC=-warped.x*0.12-warped.y*0.405+T*0.91+(patchNoise-0.5)*2.25-(finePatch-0.5)*1.1;
  float phaseD=warped.x*0.34-warped.y*0.29+T*0.82+(crossPatch-0.5)*2.5+(finePatch-0.5)*1.15;
  float phaseE=-warped.x*0.43-warped.y*0.13-T*1.48+(patchNoise-0.5)*1.65-(crossPatch-0.5)*2.1+(finePatch-0.5)*0.8;
  float broadWave=sin(phaseA)*0.56*(0.84+patchNoise*0.32);
  float crossWave=sin(phaseB)*0.34*(0.82+crossPatch*0.36);
  float longWave=cos(phaseC)*0.27*(0.82+finePatch*0.36);
  float diagonalWave=sin(phaseD)*0.19*(0.84+crossPatch*0.32);
  float shortWave=sin(phaseE)*0.11*(0.88+patchNoise*0.24);
  float noiseLift=(patchNoise-0.5)*0.16+(crossPatch-0.5)*0.13+(finePatch-0.5)*0.07;
  float frontAmount=1.0-smoothstep(0.12,0.78,uv.y);
  float y=(broadWave+crossWave+longWave+diagonalWave+shortWave+noiseLift)*mix(1.0,1.48,frontAmount);
  vec3 position=vec3(x,y,z);
  const vec3 target=vec3(0.0,0.0,-8.0);
  float cameraYaw=uView.x-uPointer.x*0.30;
  float cameraPitch=uView.y+uPointer.y*0.22;
  float cameraRoll=uView.z+uPointer.z*0.16;
  vec3 cameraOffset=vec3(-sin(cameraYaw)*cos(cameraPitch),sin(cameraPitch),cos(cameraYaw)*cos(cameraPitch));
  vec3 cameraPosition=target+cameraOffset*uView.w;
  vec3 forward=normalize(target-cameraPosition);
  vec3 right=normalize(cross(forward,vec3(0.0,1.0,0.0)));
  vec3 cameraUp=cross(right,forward);
  vec3 relative=position-cameraPosition;
  float rollCos=cos(cameraRoll),rollSin=sin(cameraRoll);
  vec3 rolledRight=right*rollCos+cameraUp*rollSin;
  vec3 rolledUp=cameraUp*rollCos-right*rollSin;
  float depth=dot(relative,forward);
  float viewX=dot(relative,rolledRight);
  float viewY=dot(relative,rolledUp);
  const float tanHalfFov=0.50;
  if(depth<=0.1){gl_Position=vec4(2.0,2.0,2.0,1.0);gl_PointSize=1.0;vAlpha=0.0;return;}
  gl_Position=vec4(viewX/(uAspect*tanHalfFov*depth)+uShift.x,viewY/(tanHalfFov*depth)+uShift.y,0.0,1.0);
  float perspectiveSize=0.064*uViewportHeight/(tanHalfFov*max(depth,1.0));
  float normalizedElevation=clamp(y/1.70,-1.0,1.0);
  float crestResponse=pow(smoothstep(-0.62,0.72,normalizedElevation),1.55);
  gl_PointSize=clamp(perspectiveSize*mix(0.32,1.58,crestResponse),0.8,13.8);
  float farAmount=smoothstep(12.0,86.0,depth);
  float waveLight=smoothstep(-0.55,0.62,y);
  float troughVisibility=mix(0.26,1.0,smoothstep(-0.95,-0.18,normalizedElevation));
  float horizonFade=1.0-smoothstep(0.82,1.0,uv.y);
  vAlpha=mix(0.64,0.25,farAmount)*mix(0.90,1.0,waveLight)*troughVisibility*horizonFade;
}`;

export const FS = `#version 300 es
precision highp float;
in float vAlpha;
out vec4 outColor;
void main(){
  float edge=1.0-smoothstep(0.28,0.5,length(gl_PointCoord-vec2(0.5)));
  float alpha=vAlpha*edge;
  outColor=vec4(vec3(0.82,0.86,0.89)*alpha,alpha);
}`;
