/** A result button may only act on a release whose press began on that same button with the same pointer.
 * Phaser reports a release over a button even when the finger went down elsewhere (the joystick, Attack, the battlefield). */
export class PressArm<T=unknown>{
 private id:number|null=null;private target:T|null=null;
 arm(id:number,target:T){this.id=id;this.target=target;}
 /** True when this release completes the armed press on `target`; the arm is spent either way. */
 release(id:number,target:T){const ok=this.id!==null&&this.id===id&&this.target===target;this.clear();return ok;}
 clear(){this.id=null;this.target=null;}
 get armed(){return this.id!==null;}
}
