export interface HasId {
  readonly id: string;
}

export interface NamedElement extends HasId {
  readonly firstname: string;
  readonly lastname: string;
}

export interface TutorialInEntity extends HasId {
  readonly slot: string;
}
