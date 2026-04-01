//
//  Copyright 2026 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import PvBat

public enum BatLanguage: Int, CaseIterable {
    case UNKNOWN = 0
    case DE = 1
    case EN = 2
    case ES = 3
    case FR = 4
    case IT = 5
    case JA = 6
    case KO = 7
    case PT = 8
}

extension BatLanguage {
    public static func numLanguages() -> Int {
        return Int(PV_BAT_LANGUAGE_NUM_LANGUAGES)
    }

    public func toString() -> String {
        switch self {
        case .UNKNOWN:
            return "unknown"
        case .DE:
            return "de"
        case .EN:
            return "en"
        case .ES:
            return "es"
        case .FR:
            return "fr"
        case .IT:
            return "it"
        case .JA:
            return "ja"
        case .KO:
            return "ko"
        case .PT:
            return "pt"
        }
    }

    public static func fromString(_ language: String) -> BatLanguage? {
        switch language.lowercased() {
        case "unknown":
            return BatLanguage.UNKNOWN
        case "de":
            return BatLanguage.DE
        case "en":
            return BatLanguage.EN
        case "es":
            return BatLanguage.ES
        case "fr":
            return BatLanguage.FR
        case "it":
            return BatLanguage.IT
        case "ja":
            return BatLanguage.JA
        case "ko":
            return BatLanguage.KO
        case "pt":
            return BatLanguage.PT
        default:
            return nil
        }
    }
}
