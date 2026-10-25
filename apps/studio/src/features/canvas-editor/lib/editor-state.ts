import {
  type AddableType,
  type CanvasDoc,
  type CanvasElement,
  createElement,
  newId,
  type ScreenDoc,
  type ScreenKey,
  SINGLETON_TYPES,
} from './model';

/** Editor state with snapshot undo/redo. Only document changes go into history, not selection. */
export interface EditorState {
  doc: CanvasDoc;
  screen: ScreenKey;
  selectedId: string | null;
  past: CanvasDoc[];
  future: CanvasDoc[];
}

const HISTORY_LIMIT = 100;

export type EditorAction =
  | { type: 'selectScreen'; screen: ScreenKey }
  | { type: 'select'; id: string | null }
  | { type: 'add'; elementType: AddableType; cx: number; cy: number; name: string }
  | { type: 'update'; id: string; patch: Partial<CanvasElement>; coalesce?: boolean }
  | { type: 'updateScreen'; patch: Partial<Omit<ScreenDoc, 'elements'>>; coalesce?: boolean }
  | { type: 'remove'; id: string }
  | { type: 'duplicate'; id: string }
  | { type: 'reorder'; id: string; toIndex: number }
  | { type: 'reset'; doc: CanvasDoc }
  /** The document changed outside the editor (controlled mode): adopt it, keep screen/selection. */
  | { type: 'sync'; doc: CanvasDoc }
  | { type: 'undo' }
  | { type: 'redo' };

export function createEditorState(doc: CanvasDoc): EditorState {
  return { doc, screen: 'cover', selectedId: null, past: [], future: [] };
}

export function currentScreen(state: EditorState): ScreenDoc {
  return state.doc[state.screen];
}

export function selectedElement(state: EditorState): CanvasElement | undefined {
  return currentScreen(state).elements.find((e) => e.id === state.selectedId);
}

/**
 * Applies a document change. `coalesce` merges a continuous gesture (drag, slider) into the
 * previous history entry, so one drag is one undo step.
 */
function commit(state: EditorState, screen: ScreenDoc, coalesce = false): EditorState {
  const doc = { ...state.doc, [state.screen]: screen };
  const past = coalesce && state.past.length ? state.past : [...state.past, state.doc];
  return { ...state, doc, past: past.slice(-HISTORY_LIMIT), future: [] };
}

function withElements(screen: ScreenDoc, elements: CanvasElement[]): ScreenDoc {
  return { ...screen, elements };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const screen = currentScreen(state);
  switch (action.type) {
    case 'selectScreen':
      return { ...state, screen: action.screen, selectedId: null };
    case 'select':
      return { ...state, selectedId: action.id };
    case 'add': {
      const element = createElement(action.elementType, action.cx, action.cy, action.name);
      return {
        ...commit(state, withElements(screen, [...screen.elements, element])),
        selectedId: element.id,
      };
    }
    case 'update': {
      const elements = screen.elements.map((e) =>
        e.id === action.id ? ({ ...e, ...action.patch } as CanvasElement) : e,
      );
      return commit(state, withElements(screen, elements), action.coalesce);
    }
    case 'updateScreen':
      return commit(state, { ...screen, ...action.patch }, action.coalesce);
    case 'remove': {
      const target = screen.elements.find((e) => e.id === action.id);
      if (!target || SINGLETON_TYPES.includes(target.type)) return state;
      return {
        ...commit(
          state,
          withElements(
            screen,
            screen.elements.filter((e) => e.id !== action.id),
          ),
        ),
        selectedId: null,
      };
    }
    case 'duplicate': {
      const index = screen.elements.findIndex((e) => e.id === action.id);
      const source = screen.elements[index];
      if (!source || SINGLETON_TYPES.includes(source.type)) return state;
      const copy = {
        ...source,
        id: newId(),
        name: `${source.name} 2`,
        x: source.x + 12,
        y: source.y + 12,
      };
      const elements = [...screen.elements];
      elements.splice(index + 1, 0, copy);
      return { ...commit(state, withElements(screen, elements)), selectedId: copy.id };
    }
    case 'reorder': {
      const from = screen.elements.findIndex((e) => e.id === action.id);
      if (from < 0) return state;
      const to = Math.max(0, Math.min(screen.elements.length - 1, action.toIndex));
      if (from === to) return state;
      const elements = [...screen.elements];
      const [moved] = elements.splice(from, 1);
      if (!moved) return state;
      elements.splice(to, 0, moved);
      return commit(state, withElements(screen, elements));
    }
    case 'reset':
      return { ...createEditorState(action.doc), screen: state.screen };
    case 'sync': {
      const stillThere = action.doc[state.screen].elements.some((e) => e.id === state.selectedId);
      return {
        ...createEditorState(action.doc),
        screen: state.screen,
        selectedId: stillThere ? state.selectedId : null,
      };
    }
    case 'undo': {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        ...state,
        doc: previous,
        past: state.past.slice(0, -1),
        future: [state.doc, ...state.future],
      };
    }
    case 'redo': {
      const [next, ...rest] = state.future;
      if (!next) return state;
      return { ...state, doc: next, past: [...state.past, state.doc], future: rest };
    }
  }
}
