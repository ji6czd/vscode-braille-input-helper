import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // コントローラーの初期化
    const brailleController = new BrailleController(context);
    context.subscriptions.push(brailleController);
}

export function deactivate() {}

/**
 * 点字入力を管理するコントローラークラス
 */
class BrailleController {
    private isActive: boolean = false;
    private statusBarItem: vscode.StatusBarItem;
    private currentChord: number = 0; // 現在押されている点のビット和
    private timer: NodeJS.Timeout | undefined;
	private readonly TIMER_DELAY = 150; // 同時押し判定時間 (150ms)

    constructor(private context: vscode.ExtensionContext) {
        // ステータスバーアイテムの作成
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'braille-input-helper.toggle';
        context.subscriptions.push(this.statusBarItem);

        // コマンドの登録
        context.subscriptions.push(
            vscode.commands.registerCommand('braille-input-helper.toggle', () => this.toggle()),
            vscode.commands.registerCommand('braille-input-helper.input', (dot: number) => this.handleInput(dot)),
            vscode.commands.registerCommand('type', (args) => this.handleType(args))
        );

        // 初期表示の更新
        this.updateStatus();
    }

    /**
     * 通常の文字入力を制御する
     * 点字モードON時は、スペースや改行以外の文字入力をブロックする
     */
    private handleType(args: { text: string }) {
        // モードがOFF、または入力がホワイトスペース（スペース、改行、タブ等）の場合は通常通り入力させる
        if (!this.isActive || (args.text && /^\s+$/.test(args.text))) {
            vscode.commands.executeCommand('default:type', args);
        }
        // それ以外の文字（a-z, 0-9等）はブロック（何もしない）
    }

    /**
     * 入力モードの切り替え
     */
    private toggle() {
        this.isActive = !this.isActive;
        // setContextを使ってkeybindingsの有効/無効を制御
        vscode.commands.executeCommand('setContext', 'braille-input-helper.isActive', this.isActive);
        this.updateStatus();
    }

    /**
     * ステータスバーの表示更新
     */
    private updateStatus() {
        this.statusBarItem.show();
        if (this.isActive) {
            this.statusBarItem.text = '$(circle-filled) Braille Mode: ON';
            this.statusBarItem.tooltip = 'Click to disable Braille Input';
            // モードON時は目立つ色に変更
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground'); 
        } else {
            this.statusBarItem.text = '$(circle-outline) Braille Mode: OFF';
            this.statusBarItem.tooltip = 'Click to enable Braille Input';
            this.statusBarItem.backgroundColor = undefined; // デフォルト色
        }
    }

    /**
     * キー入力処理
     * @param dot 点のビット値 (1, 2, 4, 8, 16, 32)
     */
    private handleInput(dot: number) {
        if (!this.isActive) {
            return;
        }

        // 入力された点を現在のコードに追加（ビット和）
        this.currentChord |= dot;

        // 既存のタイマーがあればリセット（デバウンス処理）
        if (this.timer) {
            clearTimeout(this.timer);
        }

        // 指定時間後に文字を確定するタイマーをセット
        this.timer = setTimeout(() => {
            this.commitCharacter();
        }, this.TIMER_DELAY);
    }

    /**
     * 文字の確定とエディタへの挿入
     */
    private commitCharacter() {
        if (this.currentChord === 0) {
            return;
        }

        // 点字パターンのUnicodeコードポイントを計算 (U+2800 が空の点字)
        const charCode = 0x2800 + this.currentChord;
        const char = String.fromCharCode(charCode);

        // アクティブなエディタに挿入
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.edit(editBuilder => {
                // カーソル位置に挿入
                editBuilder.insert(editor.selection.active, char);
            });
        }

        // バッファとタイマーをリセット
        this.currentChord = 0;
        this.timer = undefined;
    }

    public dispose() {
        this.statusBarItem.dispose();
    }
}
