//
//  Copyright 2026 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import PvBat

public enum BatLanguages: Int, CaseIterable {
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

extension BatLanguages {
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

    public static func fromString(_ language: String) -> BatLanguages? {
        switch language.lowercased() {
        case "unknown":
            return BatLanguages.UNKNOWN
        case "de":
            return BatLanguages.DE
        case "en":
            return BatLanguages.EN
        case "es":
            return BatLanguages.ES
        case "fr":
            return BatLanguages.FR
        case "it":
            return BatLanguages.IT
        case "ja":
            return BatLanguages.JA
        case "ko":
            return BatLanguages.KO
        case "pt":
            return BatLanguages.PT
        default:
            return nil
        }
    }
}
